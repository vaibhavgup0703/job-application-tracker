// The main list page: filter by status, search, sort, paginate, delete.
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApplicationsService } from '../../core/applications.service';
import { readApiError } from '../../core/api-error';
import { ApplicationQuery, ApplicationStatus, JobApplication, STATUSES } from '../../core/models';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

// The list page's query: ApplicationQuery with every field required.
// Required<T> / Pick<T, K> are built-in "utility types" that transform other types at compile time.
type ListQuery = Required<Pick<ApplicationQuery, 'status' | 'search' | 'sort' | 'order' | 'page' | 'pageSize'>>;

@Component({
  selector: 'app-application-list',
  imports: [ReactiveFormsModule, RouterLink, StatusBadgeComponent],
  templateUrl: './application-list.component.html',
})
export class ApplicationListComponent implements OnInit {
  private api = inject(ApplicationsService);
  private destroyRef = inject(DestroyRef);

  readonly statuses = STATUSES;

  // ---- UI state as signals: changing them re-renders the parts of the template that use them ----
  items = signal<JobApplication[]>([]);
  total = signal(0);
  loading = signal(false);
  error = signal('');

  // Current query. Changing it triggers load().
  query = signal<ListQuery>({
    status: '',
    search: '',
    sort: 'updatedAt',
    order: 'desc',
    page: 1,
    pageSize: 10,
  });

  // computed = derived value, recalculated only when the signals it reads change.
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.query().pageSize)));

  // A standalone form control for the search box (no surrounding form needed).
  search = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    // RxJS pipeline on the search box:
    //   debounceTime(300)      -> wait until the user stops typing for 300 ms
    //   distinctUntilChanged() -> skip if the text didn't actually change
    // Without this, every keystroke would fire an API call.
    // Real-life example: a lift waits a moment for more people before closing the doors.
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      // takeUntilDestroyed = auto-unsubscribe when this page closes (prevents memory leaks,
      // like a destructor releasing a callback registration).
      .subscribe((search) => this.update({ search, page: 1 }));

    this.load();
  }

  // Merge a partial change into the query, then reload.
  // Partial<T> = T with every field optional.
  update(change: Partial<ListQuery>): void {
    this.query.update((q) => ({ ...q, ...change }));
    this.load();
  }

  onStatus(value: string): void {
    this.update({ status: value as ApplicationStatus | '', page: 1 });
  }

  onSort(value: string): void {
    // "company:asc" -> ['company', 'asc']
    const [sort, order] = value.split(':') as ['updatedAt' | 'appliedOn' | 'company', 'asc' | 'desc'];
    this.update({ sort, order, page: 1 });
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.update({ page });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.list(this.query()).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(readApiError(err).message);
        this.loading.set(false);
      },
    });
  }

  remove(app: JobApplication): void {
    if (!confirm(`Delete ${app.role} at ${app.company}?`)) return;
    this.api.delete(app.id).subscribe({
      next: () => {
        // If we just deleted the last row on this page, step back a page.
        const lastRowOnPage = this.items().length === 1 && this.query().page > 1;
        if (lastRowOnPage) this.goTo(this.query().page - 1);
        else this.load();
      },
      error: (err) => this.error.set(readApiError(err).message),
    });
  }
}
