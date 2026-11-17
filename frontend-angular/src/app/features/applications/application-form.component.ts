// One form for BOTH create (/applications/new) and edit (/applications/:id/edit).
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApplicationsService } from '../../core/applications.service';
import { readApiError } from '../../core/api-error';
import { ApplicationInput, ApplicationStatus, STATUSES } from '../../core/models';

@Component({
  selector: 'app-application-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './application-form.component.html',
})
export class ApplicationFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApplicationsService);
  private router = inject(Router);

  // The ":id" route parameter arrives here automatically (withComponentInputBinding in app.config.ts).
  // Undefined on the "new" page.
  id = input<string>();
  isEdit = computed(() => !!this.id()); // `!!x` converts to a real boolean

  readonly statuses = STATUSES;
  saving = signal(false);
  error = signal('');
  serverErrors = signal<Record<string, string>>({});

  form = this.fb.group({
    company: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    role: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    status: this.fb.nonNullable.control<ApplicationStatus>('Applied', Validators.required),
    location: this.fb.nonNullable.control(''),
    salaryLpa: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(1000)]),
    jobUrl: this.fb.nonNullable.control('', Validators.pattern(/^https?:\/\/.+/)),
    appliedOn: this.fb.nonNullable.control(''),
    notes: this.fb.nonNullable.control('', Validators.maxLength(2000)),
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) {
      this.form.controls.appliedOn.setValue(new Date().toISOString().slice(0, 10)); // default: today
      return;
    }
    // Edit mode: load the existing application and fill the form.
    this.api.get(Number(id)).subscribe({
      next: (app) =>
        // patchValue fills only the fields given; `?? ''` turns null into an empty input.
        this.form.patchValue({
          company: app.company,
          role: app.role,
          status: app.status,
          location: app.location ?? '',
          salaryLpa: app.salaryLpa,
          jobUrl: app.jobUrl ?? '',
          appliedOn: app.appliedOn ?? '',
          notes: app.notes ?? '',
        }),
      error: (err) => this.error.set(readApiError(err).message),
    });
  }

  // Helper the template uses to show a field's error once the user has touched it.
  invalid(name: 'company' | 'role' | 'salaryLpa' | 'jobUrl'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched(); // reveal all error messages
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.serverErrors.set({});

    const v = this.form.getRawValue();
    // Empty strings become null so the API stores "no value" rather than "".
    const body: ApplicationInput = {
      company: v.company,
      role: v.role,
      status: v.status,
      location: v.location || null,
      salaryLpa: v.salaryLpa,
      jobUrl: v.jobUrl || null,
      appliedOn: v.appliedOn || null,
      notes: v.notes || null,
    };

    const id = this.id();
    // Ternary picks which Observable to use; both emit a JobApplication.
    const request$ = id ? this.api.update(Number(id), body) : this.api.create(body);
    //          ^ "$" suffix = naming convention for Observables

    request$.subscribe({
      next: () => this.router.navigateByUrl('/applications'),
      error: (err) => {
        const { message, fields } = readApiError(err);
        this.error.set(message);
        this.serverErrors.set(fields);
        this.saving.set(false);
      },
    });
  }
}
