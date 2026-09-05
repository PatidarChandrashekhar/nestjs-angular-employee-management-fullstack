/**
 * Standalone seed script — NOT part of app bootstrap. Run explicitly via:
 *   npm run db:seed          (skips if data already exists)
 *   npm run db:seed:force    (clears employees + users first, then reseeds)
 *
 * Reads the same .env as the API (MONGODB_URI, MONGODB_DB_NAME, SEED_*).
 */
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import mongoose, { Types } from 'mongoose';
import { buildEmployeeRecord } from './employee.factory';
import { AddressSchema } from '../employees/schemas/address.schema';
import { AuditEntrySchema } from '../employees/schemas/audit.schema';

const SALT_ROUNDS = 12;

async function main() {
  const seedEnabled = process.env.SEED_ENABLED !== 'false';
  if (!seedEnabled) {
    console.log(
      'SEED_ENABLED=false — refusing to run. Set SEED_ENABLED=true in .env to allow seeding.',
    );
    process.exit(0);
  }

  const force = process.argv.includes('--force') || process.env.SEED_FORCE === 'true';
  const employeeCount = parseInt(process.env.SEED_EMPLOYEE_COUNT ?? '50', 10);
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME ?? 'employee-nestjs-api';

  await mongoose.connect(uri, { dbName });
  console.log(`Connected to MongoDB database "${dbName}".`);

  // Minimal inline schemas — deliberately independent of the Nest DI
  // container so this script can run standalone with plain `ts-node`.
  const employeeSchema = new mongoose.Schema(
    {
      employee_id: { type: String, unique: true, trim: true },
      first_name: String,
      last_name: String,
      email: { type: String, unique: true, lowercase: true, trim: true },
      phone: String,
      hire_date: Date,
      department: String,
      job_title: String,
      salary: Number,
      status: { type: String, enum: ['Active', 'OnLeave', 'Terminated'] },
      address: AddressSchema,
      skills: [String],
      manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
      audit_trail: [AuditEntrySchema],
      deleted_at: { type: Date, default: null },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'employees' },
  );
  const userSchema = new mongoose.Schema(
    {
      email: { type: String, unique: true, lowercase: true, trim: true },
      passwordHash: String,
      refreshTokenHash: { type: String, default: null },
      firstName: String,
      lastName: String,
      roles: { type: [String], default: ['employee'] },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'users' },
  );

  const EmployeeModel = mongoose.model('Employee', employeeSchema);
  const UserModel = mongoose.model('User', userSchema);

  const existingCount = await EmployeeModel.countDocuments();
  if (existingCount > 0 && !force) {
    console.log(
      `Found ${existingCount} existing employee record(s) — skipping seed. Run "npm run db:seed:force" to reset and reseed.`,
    );
    await mongoose.disconnect();
    process.exit(0);
  }

  if (force) {
    await EmployeeModel.deleteMany({});
    await UserModel.deleteMany({});
    console.log('Cleared existing employees and users (--force).');
  }

  // --- Seed users -----------------------------------------------------
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@company.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';
  const hrEmail = process.env.SEED_HR_EMAIL ?? 'hr@company.com';
  const hrPassword = process.env.SEED_HR_PASSWORD ?? 'HrUser@12345';

  await UserModel.create([
    {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, SALT_ROUNDS),
      firstName: 'System',
      lastName: 'Admin',
      roles: ['admin'],
    },
    {
      email: hrEmail,
      passwordHash: await bcrypt.hash(hrPassword, SALT_ROUNDS),
      firstName: 'HR',
      lastName: 'User',
      roles: ['hr'],
    },
  ]);
  console.log(`Seeded 2 users: ${adminEmail} (admin), ${hrEmail} (hr).`);

  // --- Seed employees, inserted sequentially so manager_id can only ever
  // reference an already-inserted (earlier) record — this makes forward
  // references and cycles structurally impossible by construction. -------
  const insertedIds: Types.ObjectId[] = [];
  const topLevelCount = Math.max(1, Math.round(employeeCount * 0.1)); // ~10% have no manager

  for (let i = 0; i < employeeCount; i++) {
    let managerId: Types.ObjectId | null = null;
    if (i >= topLevelCount && insertedIds.length > 0) {
      const candidateIndex = Math.floor(Math.random() * insertedIds.length);
      managerId = insertedIds[candidateIndex];
    }
    const record = buildEmployeeRecord(i, managerId);
    const doc = await EmployeeModel.create(record);
    insertedIds.push(doc._id as Types.ObjectId);
  }

  console.log(`Inserted ${insertedIds.length} employee records into "${dbName}".`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
