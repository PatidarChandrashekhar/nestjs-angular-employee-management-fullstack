import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Employees (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    // Populate required env vars BEFORE AppModule is compiled, since
    // ConfigModule validates them at import time. JWT_BYPASS=true lets this
    // suite exercise the employees CRUD flow without a full login round-trip.
    process.env.MONGODB_URI = mongod.getUri();
    process.env.MONGODB_DB_NAME = 'employee-nestjs-api-test';
    process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-test-refresh-secret';
    process.env.JWT_BYPASS = 'true';
    process.env.SWAGGER_ENABLED = 'false';
    process.env.LOGGING_ENABLED = 'false';
    process.env.THROTTLE_ENABLED = 'false';
    process.env.PAGINATION_DEFAULT_LIMIT = '10';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  const basePayload = {
    employee_id: 'EMP99001',
    first_name: 'Test',
    last_name: 'User',
    email: 'test.user@company.com',
    phone: '+1-555-0000',
    hire_date: '2024-01-01T00:00:00Z',
    department: 'Engineering',
    job_title: 'QA Engineer',
    salary: 90000,
    status: 'Active',
    address: {
      street: '1 Test St',
      city: 'Testville',
      state: 'TX',
      zip_code: '00000',
      country: 'USA',
    },
    skills: ['Testing'],
  };

  let createdId: string;

  it('POST /api/employees creates a record', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/employees')
      .send(basePayload)
      .expect(201);
    expect(res.body.employee_id).toBe('EMP99001');
    createdId = res.body._id;
  });

  it('POST /api/employees rejects a duplicate employee_id with 409', async () => {
    await request(app.getHttpServer()).post('/api/employees').send(basePayload).expect(409);
  });

  it('GET /api/employees applies the default pagination limit of 10', async () => {
    const res = await request(app.getHttpServer()).get('/api/employees').expect(200);
    expect(res.body.limit).toBe(10);
    expect(res.body.page).toBe(1);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('DELETE /api/employees/:id soft-deletes and excludes it from the default list', async () => {
    await request(app.getHttpServer()).delete(`/api/employees/${createdId}`).expect(204);

    const res = await request(app.getHttpServer()).get('/api/employees').expect(200);
    expect(res.body.data.find((e: { _id: string }) => e._id === createdId)).toBeUndefined();
  });

  it('GET /api/employees/:id 404s for a soft-deleted record', async () => {
    await request(app.getHttpServer()).get(`/api/employees/${createdId}`).expect(404);
  });
});
