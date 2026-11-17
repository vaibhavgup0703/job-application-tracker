// The SHELL: top navigation bar + <router-outlet>, where the current page is drawn.
// Real-life example: a TV. The frame (nav) stays; the channel (page) changes with the URL.
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.isLoggedIn()) {
      <header class="nav">
        <a class="brand" routerLink="/dashboard">JobTracker</a>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/applications" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Applications</a>
          <a routerLink="/applications/new" class="btn btn-primary btn-sm">+ New</a>
        </nav>
        <div class="user">
          <span>{{ auth.user()?.name }}</span>
          <button class="btn btn-ghost btn-sm" (click)="auth.logout()">Log out</button>
        </div>
      </header>
    }
    <main class="container">
      <router-outlet />
    </main>
  `,
  styles: `
    .nav { display: flex; align-items: center; gap: 24px; padding: 12px 24px; background: #fff; border-bottom: 1px solid var(--border); }
    .brand { font-weight: 700; font-size: 18px; color: var(--text); text-decoration: none; }
    nav { display: flex; align-items: center; gap: 16px; flex: 1; }
    nav a:not(.btn) { color: var(--muted); text-decoration: none; font-weight: 500; }
    nav a.active { color: var(--primary); }
    .user { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 14px; }
  `,
})
export class AppComponent {
  auth = inject(AuthService); // public so the template can use it
}
