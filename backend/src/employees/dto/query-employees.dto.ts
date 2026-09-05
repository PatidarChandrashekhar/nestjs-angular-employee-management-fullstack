import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { EMPLOYEE_STATUSES, EmployeeStatus } from '../schemas/employee.schema';

/**
 * Page/limit are left optional here — the service applies the actual
 * defaults (and the max-limit cap) from ConfigService (`pagination.*`),
 * driven by the PAGINATION_DEFAULT_PAGE / PAGINATION_DEFAULT_LIMIT /
 * PAGINATION_MAX_LIMIT env vars, so behavior is centrally configurable.
 */
export class QueryEmployeesDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Free-text search across name, email, job title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ enum: EMPLOYEE_STATUSES })
  @IsOptional()
  @IsEnum(EMPLOYEE_STATUSES)
  status?: EmployeeStatus;

  @ApiPropertyOptional({
    enum: [
      'employee_id',
      'first_name',
      'last_name',
      'department',
      'job_title',
      'status',
      'hire_date',
      'salary',
    ],
  })
  @IsOptional()
  @IsIn([
    'employee_id',
    'first_name',
    'last_name',
    'department',
    'job_title',
    'status',
    'hire_date',
    'salary',
  ])
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Admin-only: include soft-deleted (Terminated/removed) employees in results',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeDeleted?: boolean;
}
