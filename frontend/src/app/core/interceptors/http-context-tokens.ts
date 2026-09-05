import { HttpContextToken } from '@angular/common/http';

// Set on a request to suppress the global error-toast in error.interceptor.ts —
// for background/polling calls (e.g. footer health checks) whose failures
// shouldn't interrupt the user with a toast on every failed poll.
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
