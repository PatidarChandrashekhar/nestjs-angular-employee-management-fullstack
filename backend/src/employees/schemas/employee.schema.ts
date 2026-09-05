import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Address, AddressSchema } from './address.schema';
import { AuditEntry, AuditEntrySchema } from './audit.schema';

export type EmployeeDocument = HydratedDocument<Employee>;

// Plain-object shape (`.toObject()`/`.lean()` result) — what actually gets
// sent to clients. Hydrated Mongoose documents carry internal circular
// references (`$__`, `$locals`, ...) that make class-transformer's
// ClassSerializerInterceptor recurse infinitely, so anything crossing the
// controller boundary must be converted to this shape first. (No `Map`-typed
// props on this schema, so a plain intersection is enough — no need for
// mongoose's `FlattenMaps<T>`.)
export type EmployeeLean = Employee & { _id: Types.ObjectId };

export const EMPLOYEE_STATUSES = ['Active', 'OnLeave', 'Terminated'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'employees',
})
export class Employee {
  @Prop({ required: true, unique: true, trim: true, index: true })
  employee_id: string;

  @Prop({ required: true, trim: true })
  first_name: string;

  @Prop({ required: true, trim: true })
  last_name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true })
  hire_date: Date;

  @Prop({ required: true, trim: true, index: true })
  department: string;

  @Prop({ required: true, trim: true })
  job_title: string;

  @Prop({ required: true, min: 0 })
  salary: number;

  @Prop({ required: true, enum: EMPLOYEE_STATUSES, default: 'Active', index: true })
  status: EmployeeStatus;

  @Prop({ type: AddressSchema, required: true })
  address: Address;

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop({ type: Types.ObjectId, ref: Employee.name, default: null, index: true })
  manager_id: Types.ObjectId | null;

  @Prop({ type: [AuditEntrySchema], default: [] })
  audit_trail: AuditEntry[];

  // Soft delete marker. Absent/null = active record. GET /employees excludes
  // soft-deleted records by default (see employees.service.ts).
  @Prop({ type: Date, default: null })
  deleted_at: Date | null;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

// Compound index supporting the most common list filter combination.
EmployeeSchema.index({ department: 1, status: 1 });
// Text index to support free-text `search` queries across name/email/job title.
EmployeeSchema.index({ first_name: 'text', last_name: 'text', email: 'text', job_title: 'text' });
