import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { ToastService } from '../../shared/ui/toast.service';
import { Employee, EmployeeQueryParams, EmployeeStatus } from '../employee.interface';
import { EmployeeService } from '../employee.service';

type SortColumn = NonNullable<EmployeeQueryParams['sortBy']>;
type SortOrder = 'asc' | 'desc';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './employee-list.component.html',
})
export class EmployeeListComponent {
  readonly currentPage = signal(1);
  readonly pageSize = signal(environment.paginationDefaultLimit);
  readonly searchTerm = signal('');
  readonly departmentFilter = signal('');
  readonly statusFilter = signal<EmployeeStatus | ''>('');
  readonly sortBy = signal<SortColumn | null>(null);
  readonly sortOrder = signal<SortOrder>('asc');

  readonly isLoading = signal(false);
  readonly employees = signal<Employee[]>([]);
  readonly total = signal(0);
  readonly totalPages = signal(1);

  readonly canManage = computed(() => this.authService.hasRole('admin', 'hr'));

  private readonly debouncedSearch = toSignal(
    toObservable(this.searchTerm).pipe(
      debounceTime(environment.searchDebounceMs),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );

  constructor(
    private readonly employeeService: EmployeeService,
    private readonly toastService: ToastService,
    private readonly authService: AuthService,
  ) {
    // Any change to page, page size, debounced search, department, or status
    // triggers exactly one fresh request — switchMap cancels any in-flight
    // request that a newer change has already superseded.
    toObservable(
      computed(() => ({
        page: this.currentPage(),
        limit: this.pageSize(),
        search: this.debouncedSearch(),
        department: this.departmentFilter(),
        status: this.statusFilter(),
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
      })),
    )
      .pipe(
        switchMap((query) => {
          this.isLoading.set(true);
          return this.employeeService.list({
            page: query.page,
            limit: query.limit,
            search: query.search || undefined,
            department: query.department || undefined,
            status: (query.status || undefined) as EmployeeStatus | undefined,
            sortBy: query.sortBy ?? undefined,
            sortOrder: query.sortBy ? query.sortOrder : undefined,
          });
        }),
      )
      .subscribe({
        next: (res) => {
          this.employees.set(res.data);
          this.total.set(res.total);
          this.totalPages.set(res.totalPages);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });

    // Reset to page 1 whenever a filter changes so the user isn't left on a
    // now-out-of-range page.
    effect(() => {
      this.debouncedSearch();
      this.departmentFilter();
      this.statusFilter();
      this.sortBy();
      this.sortOrder();
      this.currentPage.set(1);
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  toggleSort(column: SortColumn): void {
    if (this.sortBy() === column) {
      this.sortOrder.update((order) => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(column);
      this.sortOrder.set('asc');
    }
  }

  ariaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
    if (this.sortBy() !== column) return 'none';
    return this.sortOrder() === 'asc' ? 'ascending' : 'descending';
  }

  initials(employee: Employee): string {
    const a = employee.first_name.trim().charAt(0);
    const b = employee.last_name.trim().charAt(0);
    return (a + b).toUpperCase() || '—';
  }

  remove(employee: Employee): void {
    if (!confirm(`Remove ${employee.first_name} ${employee.last_name}?`)) return;
    this.employeeService.softDelete(employee._id).subscribe({
      next: () => {
        this.toastService.show('Employee removed.', 'success');
        this.employees.update((list) => list.filter((e) => e._id !== employee._id));
      },
    });
  }
}
