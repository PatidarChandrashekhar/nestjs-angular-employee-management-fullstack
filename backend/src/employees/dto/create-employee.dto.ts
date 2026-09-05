import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EMPLOYEE_STATUSES, EmployeeStatus } from '../schemas/employee.schema';
import { AddressDto } from './address.dto';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'EMP10024' })
  @IsString()
  @MinLength(1)
  employee_id: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @MinLength(1)
  first_name: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  last_name: string;

  @ApiProperty({ example: 'jane.doe@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1-555-0199' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '2024-03-15T00:00:00Z' })
  @IsDateString()
  hire_date: string;

  @ApiProperty({ example: 'Engineering' })
  @IsString()
  @MinLength(1)
  department: string;

  @ApiProperty({ example: 'Senior Full-Stack Engineer' })
  @IsString()
  @MinLength(1)
  job_title: string;

  @ApiProperty({ example: 115000 })
  @IsNumber()
  @Min(0)
  salary: number;

  @ApiProperty({ enum: EMPLOYEE_STATUSES, example: 'Active' })
  @IsEnum(EMPLOYEE_STATUSES)
  status: EmployeeStatus;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiProperty({ type: [String], example: ['JavaScript', 'Node.js', 'MongoDB'] })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({ required: false, example: '65f1a2b3c4d5e6f7a8b9c000' })
  @IsOptional()
  @IsMongoId()
  manager_id?: string;
}
