import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { readApiError } from '../../core/api-error';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-card card">
      <h1>Create account</h1>

      @if (error()) { <p class="alert">{{ error() }}</p> }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Name
          <input formControlName="name" autocomplete="name" />
          <!-- Show the error only after the user has touched the field -->
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <small class="field-error">At least 2 characters.</small>
          }
          @if (serverErrors()['name']) { <small class="field-error">{{ serverErrors()['name'] }}</small> }
        </label>

        <label>Email
          <input type="email" formControlName="email" autocomplete="email" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <small class="field-error">Enter a valid email.</small>
          }
          @if (serverErrors()['email']) { <small class="field-error">{{ serverErrors()['email'] }}</small> }
        </label>

        <label>Password
          <input type="password" formControlName="password" autocomplete="new-password" />
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <small class="field-error">At least 8 characters.</small>
          }
          @if (serverErrors()['password']) { <small class="field-error">{{ serverErrors()['password'] }}</small> }
        </label>

        <button class="btn btn-primary" type="submit" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Creating…' : 'Create account' }}
        </button>
      </form>

      <p class="muted">Already registered? <a routerLink="/login">Log in</a></p>
    </section>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');
  serverErrors = signal<Record<string, string>>({});

  // Same rules as the backend. The frontend check is for user experience;
  // the BACKEND check is the real security, because anyone can bypass the UI.
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    this.serverErrors.set({});

    const { name, email, password } = this.form.getRawValue();
    this.auth.register(name, email, password).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (err) => {
        const { message, fields } = readApiError(err);
        this.error.set(message);
        this.serverErrors.set(fields);
        this.loading.set(false);
      },
    });
  }
}
