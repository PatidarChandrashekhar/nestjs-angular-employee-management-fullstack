import { CommonModule } from '@angular/common';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, interval, of, startWith, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { SKIP_ERROR_TOAST } from '../../core/interceptors/http-context-tokens';

type SystemStatus = 'checking' | 'ok' | 'down';

const HEALTH_POLL_MS = 30_000;
const CLOCK_TICK_MS = 1_000;

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-col footer-brand">
          <a class="navbar-brand" routerLink="/employees">
            <span class="navbar-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path
                  d="M12 2 2 7l10 5 10-5-10-5Z M2 17l10 5 10-5 M2 12l10 5 10-5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            Employee Management
          </a>
          <p class="footer-tagline">
            Centralized workforce records, roles, and org structure — built on NestJS &amp; Angular.
          </p>
          <div class="footer-status">
            <span class="status-dot" [class]="'status-dot-' + status()"></span>
            <span>{{ statusLabel() }}</span>
            <span class="footer-status-meta">· checked {{ checkedAgoLabel() }}</span>
          </div>
        </div>

        <div class="footer-col">
          <h3>Navigate</h3>
          <ul class="footer-links">
            <li><a routerLink="/employees">Employee Directory</a></li>
            @if (canManage()) {
              <li><a routerLink="/employees/new">Add Employee</a></li>
            }
          </ul>
        </div>

        <div class="footer-col">
          <h3>Developers</h3>
          <ul class="footer-links">
            <li><a [href]="apiDocsUrl" target="_blank" rel="noopener">API Reference (Swagger)</a></li>
            <li><a [href]="apiHealthUrl" target="_blank" rel="noopener">Health Endpoint</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h3>System</h3>
          <ul class="footer-links footer-meta-list">
            <li>Environment: <span class="id-chip">{{ environmentLabel }}</span></li>
            <li>Version: <span class="id-chip">v{{ appVersion }}</span></li>
            <li>Local time: <span class="id-chip">{{ clockLabel() }}</span></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© {{ year() }} Employee Management. All rights reserved.</span>
        <span class="footer-credit">Designed &amp; maintained by <span class="footer-credit-name">Chandra Patidar</span></span>
        <span>Signed in as {{ authService.currentUserEmail() ?? 'guest' }}</span>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly appVersion = '1.0.0';
  readonly environmentLabel = environment.production ? 'Production' : 'Development';
  readonly apiDocsUrl = environment.apiBaseUrl.replace(/\/api\/v\d+\/?$/, '/api/docs');
  readonly apiHealthUrl = `${environment.apiBaseUrl}/health/ready`;

  readonly canManage = computed(() => this.authService.hasRole('admin', 'hr'));

  private readonly now = signal(new Date());
  readonly clockLabel = computed(() =>
    this.now().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  );
  readonly year = computed(() => this.now().getFullYear());

  readonly status = signal<SystemStatus>('checking');
  private readonly lastCheckedAt = signal<Date | null>(null);

  readonly statusLabel = computed(() => {
    switch (this.status()) {
      case 'ok':
        return 'All systems operational';
      case 'down':
        return 'API unreachable';
      default:
        return 'Checking status…';
    }
  });

  readonly checkedAgoLabel = computed(() => {
    const checkedAt = this.lastCheckedAt();
    if (!checkedAt) return 'just now';
    const seconds = Math.max(0, Math.round((this.now().getTime() - checkedAt.getTime()) / 1000));
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.round(seconds / 60)}m ago`;
  });

  constructor() {
    interval(CLOCK_TICK_MS)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(new Date()));

    interval(HEALTH_POLL_MS)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.http
            .get(this.apiHealthUrl, { context: new HttpContext().set(SKIP_ERROR_TOAST, true) })
            .pipe(
              switchMap(() => of<SystemStatus>('ok')),
              catchError(() => of<SystemStatus>('down')),
            ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((status) => {
        this.status.set(status);
        this.lastCheckedAt.set(new Date());
      });
  }
}
