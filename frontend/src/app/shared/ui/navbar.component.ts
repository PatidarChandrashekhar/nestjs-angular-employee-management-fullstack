import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    @if (authService.isAuthenticated()) {
      <nav class="navbar">
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

        <div class="navbar-links">
          <a class="navbar-link" routerLink="/employees" routerLinkActive="active">Employees</a>
        </div>

        <div class="navbar-user">
          <div class="navbar-user-meta">
            <span class="navbar-user-email">{{ authService.currentUserEmail() }}</span>
            <span class="navbar-user-roles">
              @for (role of authService.currentUserRoles(); track role) {
                <span class="role-chip">{{ role }}</span>
              }
            </span>
          </div>
          <span class="avatar">{{ initials() }}</span>
          <button type="button" class="btn-icon" title="Log out" aria-label="Log out" (click)="logout()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </nav>
    }
  `,
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly initials = computed(() => {
    const email = this.authService.currentUserEmail() ?? '';
    const local = email.split('@')[0] ?? '';
    const parts = local.split(/[._-]/).filter(Boolean);
    const letters =
      parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
    return letters.toUpperCase() || '—';
  });

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
