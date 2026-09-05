import { CreateEmployeeDto } from './create-employee.dto';

// PUT semantics: full-resource replace, so this mirrors CreateEmployeeDto exactly
// (all fields required) rather than being a partial type.
export class ReplaceEmployeeDto extends CreateEmployeeDto {}
