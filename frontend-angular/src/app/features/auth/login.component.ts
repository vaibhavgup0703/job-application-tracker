// Login page using REACTIVE FORMS: the form's structure and validation rules live in the
// TypeScript class (testable), not scattered in the HTML. Interviewers often ask
// "template-driven vs reactive forms". Reactive = explicit, typed, better for complex forms.
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { readApiError } from '../../core/api-error';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-card card">
      <h1>Log in</h1>
      <p class="muted">Track every job application in one place.</p>

      @if (error()) { <p class="alert">{{ error() }}</p> }

      <!-- [formGroup] connects this <form> to the FormGroup object in the class -->
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Email
          <input type="email" formControlName="email" autocomplete="email" />
        </label>
        <label>Password
          <input type="password" formControlName="password" autocomplete="current-password" />
        </label>
        <button class="btn btn-primary" type="submit" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Logging in…' : 'Log in' }}
        </button>
        <button class="btn btn-ghost" type="button" [disabled]="loading()" (click)="tryDemo()">
          Try the demo account
        </button>
      </form>

      @if (waking()) {
        <p class="muted">Waking up the server. The free host sleeps when idle, so the first request can take up to a minute.</p>
      }

      <p class="muted">No account? <a routerLink="/register">Create one</a></p>
    </section>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');
  waking = signal(false); // true when the request is slow (the free backend is waking from sleep)

  // nonNullable: reset() goes back to '' instead of null, so values stay typed as string.
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  // Fill in the demo credentials (seeded by the backend's DemoSeeder) and log in.
  tryDemo(): void {
    this.form.setValue({ email: 'demo@jobtracker.dev', password: 'Demo@12345' });
    this.submit();
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    // If no answer within 4 s, explain the delay instead of looking broken.
    // setTimeout = run once after a delay (like a one-shot timer); clearTimeout cancels it.
    const slowTimer = setTimeout(() => this.waking.set(true), 4000);
    const done = () => {
      clearTimeout(slowTimer);
      this.waking.set(false);
    };

    const { email, password } = this.form.getRawValue(); // destructuring, like C++17 structured bindings
    this.auth.login(email, password).subscribe({
      next: () => {
        done();
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        done();
        this.error.set(readApiError(err).message);
        this.loading.set(false);
      },
    });
  }
}
