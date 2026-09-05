import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { ToastService } from '../../shared/ui/toast.service';
import { SKIP_ERROR_TOAST } from './http-context-tokens';

/**
 * Global HTTP error handling:
 *  - 401 on any request other than /auth/*: attempt exactly one silent
 *    refresh-and-retry. If the refresh itself fails, clear auth state and
 *    redirect to /login (no infinite retry loops).
 *  - Every other error surfaces a toast with the server's message when
 *    available, and is logged to the console when LOGGING_ENABLED=true.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthEndpoint = req.url.includes('/auth/');

      if (error.status === 401 && !isAuthEndpoint) {
        return authService.refresh().pipe(
          switchMap(() => {
            const token = authService.getAccessToken();
            const retried = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
            return next(retried);
          }),
          catchError((refreshError) => {
            authService.logout();
            router.navigateByUrl('/login');
            return throwError(() => refreshError);
          }),
        );
      }

      if (!req.context.get(SKIP_ERROR_TOAST)) {
        const message = (error.error?.message as string | string[] | undefined) ?? error.message;
        toastService.show(Array.isArray(message) ? message.join(', ') : message, 'error');
      }

      if (environment.loggingEnabled) {
        // eslint-disable-next-line no-console
        console.error('[HTTP error]', error.status, error.url, error.error);
      }

      return throwError(() => error);
    }),
  );
};
