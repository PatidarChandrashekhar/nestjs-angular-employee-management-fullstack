import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';
import { EMPLOYEE_STATUSES } from '../employees/schemas/employee.schema';

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Support'];

export function buildEmployeeRecord(sequence: number, managerId: Types.ObjectId | null) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const department = faker.helpers.arrayElement(DEPARTMENTS);

  return {
    employee_id: `EMP${(10000 + sequence).toString()}`,
    first_name: firstName,
    last_name: lastName,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    phone: faker.phone.number(),
    hire_date: faker.date.past({ years: 8 }),
    department,
    job_title: faker.person.jobTitle(),
    salary: faker.number.int({ min: 45000, max: 220000 }),
    status: faker.helpers.arrayElement(EMPLOYEE_STATUSES),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip_code: faker.location.zipCode(),
      country: 'USA',
    },
    skills: faker.helpers.arrayElements(
      [
        'JavaScript',
        'TypeScript',
        'Node.js',
        'MongoDB',
        'React',
        'Angular',
        'AWS',
        'Docker',
        'SQL',
        'Python',
      ],
      faker.number.int({ min: 2, max: 5 }),
    ),
    manager_id: managerId,
    audit_trail: [
      {
        changed_by: 'seed-script',
        changed_at: new Date(),
        diff: { record: { from: null, to: 'seeded' } },
      },
    ],
    deleted_at: null,
  };
}
