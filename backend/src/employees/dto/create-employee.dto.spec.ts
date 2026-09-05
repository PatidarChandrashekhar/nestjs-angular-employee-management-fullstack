import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';

const validPayload = {
  employee_id: 'EMP10099',
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane.doe@company.com',
  phone: '+1-555-0199',
  hire_date: '2024-03-15T00:00:00Z',
  department: 'Engineering',
  job_title: 'Senior Full-Stack Engineer',
  salary: 115000,
  status: 'Active',
  address: {
    street: '123 Main Street',
    city: 'Austin',
    state: 'TX',
    zip_code: '78701',
    country: 'USA',
  },
  skills: ['JavaScript', 'Node.js'],
};

describe('CreateEmployeeDto', () => {
  it('accepts a fully valid payload', async () => {
    const dto = plainToInstance(CreateEmployeeDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a negative salary', async () => {
    const dto = plainToInstance(CreateEmployeeDto, { ...validPayload, salary: -1 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'salary')).toBe(true);
  });

  it('rejects an invalid status enum value', async () => {
    const dto = plainToInstance(CreateEmployeeDto, { ...validPayload, status: 'Retired' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });

  it('rejects a malformed email', async () => {
    const dto = plainToInstance(CreateEmployeeDto, { ...validPayload, email: 'not-an-email' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});
