import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';

// PATCH semantics: every field optional, applied as a $set on the existing document.
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiProperty({ required: false })
  declare employee_id?: string;
}
