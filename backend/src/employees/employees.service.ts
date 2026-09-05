import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, SortOrder } from 'mongoose';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { ReplaceEmployeeDto } from './dto/replace-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee, EmployeeDocument, EmployeeLean } from './schemas/employee.schema';
import { NoManagerCycleValidator } from './validators/no-manager-cycle.validator';

const AUDITED_FIELDS = ['salary', 'status'] as const;

/**
 * Round-trips a lean/plain Mongoose object through JSON so BSON types
 * (ObjectId, Date, ...) collapse to their JSON-safe form (e.g. ObjectId ->
 * hex string) via their own `toJSON()`. Without this, the global
 * ClassSerializerInterceptor's plain-property walk mangles those instances
 * into unusable nested objects (e.g. `_id` coming back as `{}` instead of a
 * string) instead of calling their `toJSON()`.
 */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    private readonly configService: ConfigService,
    private readonly cycleValidator: NoManagerCycleValidator,
  ) {}

  async create(dto: CreateEmployeeDto, actorEmail: string): Promise<EmployeeLean> {
    if (dto.manager_id) {
      await this.cycleValidator.assertValid(dto.manager_id);
    }
    const created = new this.employeeModel({
      ...dto,
      hire_date: new Date(dto.hire_date),
      audit_trail: [
        {
          changed_by: actorEmail,
          changed_at: new Date(),
          diff: { record: { from: null, to: 'created' } },
        },
      ],
    });
    const saved = await created.save();
    return toPlain(saved.toObject());
  }

  async findAll(query: QueryEmployeesDto): Promise<PaginatedResponse<EmployeeLean>> {
    const defaultPage = this.configService.get<number>('pagination.defaultPage') ?? 1;
    const defaultLimit = this.configService.get<number>('pagination.defaultLimit') ?? 10;
    const maxLimit = this.configService.get<number>('pagination.maxLimit') ?? 100;

    const page = query.page ?? defaultPage;
    const limit = Math.min(query.limit ?? defaultLimit, maxLimit);

    const filter: FilterQuery<EmployeeDocument> = {};

    // Soft-deleted records are excluded by default. Only surfaced when the
    // caller explicitly opts in (controller already restricts this to admins).
    if (!query.includeDeleted) {
      filter.deleted_at = null;
    }
    if (query.department) filter.department = query.department;
    if (query.status) filter.status = query.status;
    if (query.search) filter.$text = { $search: query.search };

    const sort: Record<string, SortOrder> = query.sortBy
      ? { [query.sortBy]: query.sortOrder === 'desc' ? -1 : 1 }
      : { created_at: -1 };

    const [data, total] = await Promise.all([
      this.employeeModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('manager_id', 'employee_id first_name last_name email job_title')
        .lean()
        .exec(),
      this.employeeModel.countDocuments(filter),
    ]);

    return toPlain({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
  }

  async findOne(id: string): Promise<EmployeeLean> {
    const employee = await this.employeeModel
      .findOne({ _id: id, deleted_at: null })
      .populate('manager_id', 'employee_id first_name last_name email job_title')
      .lean();
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found.`);
    }
    return toPlain(employee);
  }

  /**
   * Fetches a live (hydrated) document for internal mutation flows. Unlike
   * the public `findOne`, this can't use `.lean()` since callers need to
   * mutate fields and `.save()` the result.
   */
  private async findDocument(id: string): Promise<EmployeeDocument> {
    const employee = await this.employeeModel.findOne({ _id: id, deleted_at: null });
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found.`);
    }
    return employee;
  }

  async replace(id: string, dto: ReplaceEmployeeDto, actorEmail: string): Promise<EmployeeLean> {
    const existing = await this.findDocument(id);
    if (dto.manager_id) {
      await this.cycleValidator.assertValid(dto.manager_id, id);
    }
    const diff = this.computeAuditDiff(existing, dto);
    Object.assign(existing, dto, { hire_date: new Date(dto.hire_date) });
    if (diff) existing.audit_trail.push({ changed_by: actorEmail, changed_at: new Date(), diff });
    const saved = await existing.save();
    return toPlain(saved.toObject());
  }

  async update(id: string, dto: UpdateEmployeeDto, actorEmail: string): Promise<EmployeeLean> {
    const existing = await this.findDocument(id);
    if (dto.manager_id) {
      await this.cycleValidator.assertValid(dto.manager_id, id);
    }
    const diff = this.computeAuditDiff(existing, dto);
    Object.assign(existing, dto);
    if (dto.hire_date) existing.hire_date = new Date(dto.hire_date);
    if (diff) existing.audit_trail.push({ changed_by: actorEmail, changed_at: new Date(), diff });
    const saved = await existing.save();
    return toPlain(saved.toObject());
  }

  /** Soft delete: marks the record inactive without destroying data. */
  async softDelete(id: string, actorEmail: string): Promise<void> {
    const existing = await this.findDocument(id);
    existing.status = 'Terminated';
    existing.deleted_at = new Date();
    existing.audit_trail.push({
      changed_by: actorEmail,
      changed_at: new Date(),
      diff: {
        status: { from: existing.status, to: 'Terminated' },
        deleted_at: { from: null, to: existing.deleted_at },
      },
    });
    await existing.save();
  }

  /** Genuine, irreversible purge. Restricted to admins at the controller layer. */
  async hardDelete(id: string): Promise<void> {
    const result = await this.employeeModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Employee ${id} not found.`);
    }
  }

  private computeAuditDiff(
    existing: EmployeeDocument,
    incoming: Partial<CreateEmployeeDto>,
  ): Record<string, { from: unknown; to: unknown }> | null {
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const field of AUDITED_FIELDS) {
      if (incoming[field] !== undefined && incoming[field] !== existing[field]) {
        diff[field] = { from: existing[field], to: incoming[field] };
      }
    }
    return Object.keys(diff).length > 0 ? diff : null;
  }
}
