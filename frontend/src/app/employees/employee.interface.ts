export type EmployeeStatus = 'Active' | 'OnLeave' | 'Terminated';

export interface Address {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

export interface ManagerRef {
  _id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
}

export interface Employee {
  _id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  hire_date: string;
  department: string;
  job_title: string;
  salary: number;
  status: EmployeeStatus;
  address: Address;
  skills: string[];
  manager_id: ManagerRef | string | null;
  created_at: string;
  updated_at: string;
}

export type CreateEmployeeRequest = Omit<
  Employee,
  '_id' | 'created_at' | 'updated_at' | 'manager_id'
> & { manager_id?: string };

export type UpdateEmployeeRequest = Partial<CreateEmployeeRequest>;

export interface EmployeeQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: EmployeeStatus;
  sortBy?:
    | 'employee_id'
    | 'first_name'
    | 'last_name'
    | 'department'
    | 'job_title'
    | 'status'
    | 'hire_date'
    | 'salary';
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}
