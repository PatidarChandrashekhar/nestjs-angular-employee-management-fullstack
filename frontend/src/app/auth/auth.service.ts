import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthTokens, DecodedTokenPayload, Role } from './auth.interface';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Holds the decoded payload of the current access token, or null when
  // logged out. Every other piece of auth state derives from this signal.
  private readonly currentPayload = signal<DecodedTokenPayload | null>(this.readInitialPayload());

  readonly isAuthenticated = computed(() => this.currentPayload() !== null);
  readonly currentUserEmail = computed(() => this.currentPayload()?.email ?? null);
  readonly currentUserRoles = computed<Role[]>(() => this.currentPayload()?.roles ?? []);

  constructor(private readonly http: HttpClient) {
    if (environment.authBypass && !environment.production) {
      // Mirrors the backend's JWT_BYPASS: skip real login entirely for local UI work.
      this.currentPayload.set({
        sub: 'bypass-user',
        email: 'bypass@local.dev',
        roles: ['admin', 'hr', 'employee'],
        exp: Number.MAX_SAFE_INTEGER,
      });
    }
  }

  login(email: string, password: string): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(`${environment.apiBaseUrl}/auth/login`, { email, password })
      .pipe(tap((tokens) => this.storeTokens(tokens)));
  }

  refresh(): Observable<AuthTokens> {
    const refreshToken = localStorage.getItem(environment.authRefreshStorageKey);
    return this.http
      .post<AuthTokens>(`${environment.apiBaseUrl}/auth/refresh`, { refreshToken })
      .pipe(tap((tokens) => this.storeTokens(tokens)));
  }

  logout(): void {
    const refreshToken = localStorage.getItem(environment.authRefreshStorageKey);
    // Best-effort revoke; clear local state regardless of whether it succeeds.
    this.http
      .post(`${environment.apiBaseUrl}/auth/logout`, { refreshToken })
      .subscribe({ error: () => undefined });
    localStorage.removeItem(environment.authTokenStorageKey);
    localStorage.removeItem(environment.authRefreshStorageKey);
    this.currentPayload.set(null);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(environment.authTokenStorageKey);
  }

  hasRole(...roles: Role[]): boolean {
    return roles.some((r) => this.currentUserRoles().includes(r));
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(environment.authTokenStorageKey, tokens.accessToken);
    localStorage.setItem(environment.authRefreshStorageKey, tokens.refreshToken);
    this.currentPayload.set(this.decode(tokens.accessToken));
  }

  private readInitialPayload(): DecodedTokenPayload | null {
    const token = localStorage.getItem(environment.authTokenStorageKey);
    return token ? this.decode(token) : null;
  }

  private decode(token: string): DecodedTokenPayload | null {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload)) as DecodedTokenPayload;
    } catch {
      return null;
    }
  }
}
