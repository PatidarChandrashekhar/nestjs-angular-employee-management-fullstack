import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Employee, EmployeeDocument } from '../schemas/employee.schema';

const MAX_HIERARCHY_DEPTH = 50;

/**
 * Ensures a manager_id assignment never creates a cycle (A -> B -> A) and
 * always points at a real, non-soft-deleted employee. Invoked on both create
 * (where employeeId is undefined — the record doesn't exist yet) and on
 * update (where employeeId is the record being changed).
 */
@Injectable()
export class NoManagerCycleValidator {
  constructor(
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
  ) {}

  async assertValid(managerId: string, employeeId?: string): Promise<void> {
    if (employeeId && managerId === employeeId) {
      throw new BadRequestException('An employee cannot be their own manager.');
    }

    const manager = await this.employeeModel.findOne({
      _id: managerId,
      deleted_at: null,
    });
    if (!manager) {
      throw new BadRequestException('manager_id must reference an existing, active employee.');
    }

    if (!employeeId) {
      // Creating a brand-new employee: the new record can't yet be an ancestor
      // of anything, so no cycle is possible beyond the self-reference check above.
      return;
    }

    // Walk up the chain from the proposed manager toward the root, bounded by
    // MAX_HIERARCHY_DEPTH, checking whether `employeeId` appears as an ancestor.
    let currentId: Types.ObjectId | null = manager.manager_id;
    let depth = 0;
    while (currentId) {
      if (currentId.toString() === employeeId) {
        throw new BadRequestException(
          'This assignment would create a circular reporting structure.',
        );
      }
      if (++depth > MAX_HIERARCHY_DEPTH) {
        throw new BadRequestException('Management hierarchy exceeds the maximum supported depth.');
      }
      const next: EmployeeDocument | null = await this.employeeModel.findById(currentId);
      currentId = next?.manager_id ?? null;
    }
  }
}
