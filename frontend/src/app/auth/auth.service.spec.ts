import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

// A minimal, syntactically valid JWT with payload {sub, email, roles, exp}.
function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('starts unauthenticated with no stored token', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('becomes authenticated and exposes roles after a successful login', () => {
    const token = fakeJwt({ sub: '1', email: 'admin@company.com', roles: ['admin'], exp: 9999999999 });

    service.login('admin@company.com', 'Admin@12345').subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
    req.flush({ accessToken: token, refreshToken: 'refresh-token' });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUserEmail()).toBe('admin@company.com');
    expect(service.hasRole('admin')).toBe(true);
    expect(service.hasRole('hr')).toBe(false);
  });

  it('clears state on logout', () => {
    const token = fakeJwt({ sub: '1', email: 'admin@company.com', roles: ['admin'], exp: 9999999999 });
    service.login('admin@company.com', 'Admin@12345').subscribe();
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`).flush({ accessToken: token, refreshToken: 'r' });

    service.logout();
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/logout`).flush({});

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(environment.authTokenStorageKey)).toBeNull();
  });
});
