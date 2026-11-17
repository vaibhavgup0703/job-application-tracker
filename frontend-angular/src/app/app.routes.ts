// ROUTING: which component to show for which URL. A lookup table, like
// std::map<std::string, Page>. The browser URL changes but the page never fully reloads (SPA).
import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  // loadComponent = LAZY LOADING: the code for a page is downloaded only when first visited,
  // which keeps the first page load small.
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent) },

  // canActivate: [authGuard] = only logged-in users may open these pages.
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
  { path: 'applications', canActivate: [authGuard], loadComponent: () => import('./features/applications/application-list.component').then((m) => m.ApplicationListComponent) },
  { path: 'applications/new', canActivate: [authGuard], loadComponent: () => import('./features/applications/application-form.component').then((m) => m.ApplicationFormComponent) },
  { path: 'applications/:id/edit', canActivate: [authGuard], loadComponent: () => import('./features/applications/application-form.component').then((m) => m.ApplicationFormComponent) },

  { path: '**', redirectTo: 'dashboard' }, // unknown URL -> dashboard
];
