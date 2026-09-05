import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { ToastService } from '../../shared/ui/toast.service';
import { CreateEmployeeRequest, Employee, EmployeeStatus } from '../employee.interface';
import { EmployeeService } from '../employee.service';

interface EmployeeFormModel {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  hire_date: string;
  department: string;
  job_title: string;
  salary: number | null;
  status: EmployeeStatus;
  skillsCsv: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  manager_id: string;
}

const EMPTY_FORM: EmployeeFormModel = {
  employee_id: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  hire_date: '',
  department: '',
  job_title: '',
  salary: null,
  status: 'Active',
  skillsCsv: '',
  street: '',
  city: '',
  state: '',
  zip_code: '',
  country: '',
  manager_id: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './employee-detail.component.html',
})
export class EmployeeDetailComponent implements OnInit {
  readonly isNew = signal(true);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly employeeId = signal<string | null>(null);
  readonly form = signal<EmployeeFormModel>({ ...EMPTY_FORM });

  readonly fullName = computed(() => `${this.form().first_name} ${this.form().last_name}`.trim());
  readonly canEdit = computed(() => this.authService.hasRole('admin', 'hr'));

  // Client-side mirror of the backend DTO constraints — catches obvious
  // problems before a round-trip, but the backend remains the source of
  // truth (including the manager-cycle check, which requires server data).
  readonly validationErrors = computed<string[]>(() => {
    const f = this.form();
    const errors: string[] = [];
    if (!f.employee_id.trim()) errors.push('Employee ID is required.');
    if (!f.first_name.trim()) errors.push('First name is required.');
    if (!f.last_name.trim()) errors.push('Last name is required.');
    if (!EMAIL_PATTERN.test(f.email)) errors.push('A valid email is required.');
    if (!f.department.trim()) errors.push('Department is required.');
    if (!f.job_title.trim()) errors.push('Job title is required.');
    if (f.salary === null || f.salary < 0) errors.push('Salary must be zero or greater.');
    if (!f.hire_date) errors.push('Hire date is required.');
    return errors;
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly employeeService: EmployeeService,
    private readonly toastService: ToastService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isNew.set(true);
      return;
    }
    this.isNew.set(false);
    this.employeeId.set(id);
    this.isLoading.set(true);
    this.employeeService.getById(id).subscribe({
      next: (employee) => {
        this.form.set(this.toFormModel(employee));
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  updateField<K extends keyof EmployeeFormModel>(key: K, value: EmployeeFormModel[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  submit(): void {
    if (this.validationErrors().length > 0) {
      this.toastService.show('Please fix the highlighted fields before saving.', 'error');
      return;
    }

    const payload = this.toRequestPayload();
    this.isSaving.set(true);

    const request$ = this.isNew()
      ? this.employeeService.create(payload)
      : this.employeeService.update(this.employeeId() as string, payload);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastService.show(this.isNew() ? 'Employee created.' : 'Employee updated.', 'success');
        this.router.navigate(['/employees']);
      },
      error: () => this.isSaving.set(false),
    });
  }

  cancel(): void {
    this.router.navigate(['/employees']);
  }

  initials(): string {
    const f = this.form();
    const a = f.first_name.trim().charAt(0);
    const b = f.last_name.trim().charAt(0);
    return (a + b).toUpperCase() || '—';
  }

  private toFormModel(employee: Employee): EmployeeFormModel {
    return {
      employee_id: employee.employee_id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      hire_date: employee.hire_date.slice(0, 10),
      department: employee.department,
      job_title: employee.job_title,
      salary: employee.salary,
      status: employee.status,
      skillsCsv: employee.skills.join(', '),
      street: employee.address.street,
      city: employee.address.city,
      state: employee.address.state,
      zip_code: employee.address.zip_code,
      country: employee.address.country,
      manager_id:
        typeof employee.manager_id === 'string' ? employee.manager_id : (employee.manager_id?._id ?? ''),
    };
  }

  private toRequestPayload(): CreateEmployeeRequest {
    const f = this.form();
    return {
      employee_id: f.employee_id.trim(),
      first_name: f.first_name.trim(),
      last_name: f.last_name.trim(),
      email: f.email.trim().toLowerCase(),
      phone: f.phone.trim(),
      hire_date: new Date(f.hire_date).toISOString(),
      department: f.department.trim(),
      job_title: f.job_title.trim(),
      salary: f.salary ?? 0,
      status: f.status,
      skills: f.skillsCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      address: {
        street: f.street.trim(),
        city: f.city.trim(),
        state: f.state.trim(),
        zip_code: f.zip_code.trim(),
        country: f.country.trim(),
      },
      manager_id: f.manager_id.trim() || undefined,
    };
  }
}
