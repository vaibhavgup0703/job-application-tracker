// Holds "who is logged in" for the whole app, and talks to /api/auth.
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, User } from './models';

const TOKEN_KEY = 'jt_token';
const USER_KEY = 'jt_user';

@Injectable({ providedIn: 'root' }) // one shared instance (singleton)
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // SIGNAL = a value that notifies whoever reads it when it changes, so the UI updates automatically.
  // Real-life example: a scoreboard. Everyone watching sees the new score the moment it changes.
  // We restore the user from localStorage so a page refresh keeps you logged in.
  private readonly userSignal = signal<User | null>(readStoredUser());

  readonly user = this.userSignal.asReadonly();                 // others may read, not write
  readonly isLoggedIn = computed(() => this.userSignal() !== null); // recomputed when userSignal changes

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this.saveSession(res)));
    // pipe(tap(...)) = "when the reply arrives, also do this side effect", without changing the value.
    // Like inserting a logging step into a processing chain.
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, { name, email, password })
      .pipe(tap((res) => this.saveSession(res)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
    this.router.navigateByUrl('/login');
  }

  // Note: localStorage is simple but readable by any script on the page (an XSS risk).
  // Production apps often prefer an HttpOnly cookie. Good to mention in interviews.
  private saveSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.userSignal.set(res.user);
  }
}

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw && localStorage.getItem(TOKEN_KEY) ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}
