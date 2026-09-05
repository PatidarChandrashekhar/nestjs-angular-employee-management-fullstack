import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { EmployeeService } from './employee.service';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmployeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('applies the configured default page size when none is provided', () => {
    service.list({}).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/employees`,
    );
    expect(req.request.params.get('limit')).toBe(String(environment.paginationDefaultLimit));
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ data: [], total: 0, page: 1, limit: environment.paginationDefaultLimit, totalPages: 1 });
  });

  it('includes search/department/status params only when provided', () => {
    service.list({ search: 'jane', department: 'Engineering' }).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/employees`,
    );
    expect(req.request.params.get('search')).toBe('jane');
    expect(req.request.params.get('department')).toBe('Engineering');
    expect(req.request.params.has('status')).toBe(false);
    req.flush({ data: [], total: 0, page: 1, limit: 10, totalPages: 1 });
  });
});
