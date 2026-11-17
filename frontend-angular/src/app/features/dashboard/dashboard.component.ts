// Dashboard: summary cards, a status breakdown bar chart (pure CSS), and recent activity.
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApplicationsService } from '../../core/applications.service';
import { readApiError } from '../../core/api-error';
import { JobApplication, STATUSES, Stats } from '../../core/models';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, StatusBadgeComponent],
  template: `
    <div class="page-head"><h1>Dashboard</h1></div>
    @if (error()) { <p class="alert">{{ error() }}</p> }

    @if (stats(); as s) {
      <div class="stat-grid">
        <div class="card stat"><span class="muted">Total</span><strong>{{ s.total }}</strong></div>
        <div class="card stat"><span class="muted">Interviewing</span><strong>{{ s.byStatus.Interviewing }}</strong></div>
        <div class="card stat"><span class="muted">Offers</span><strong>{{ s.byStatus.Offer }}</strong></div>
        <div class="card stat"><span class="muted">Response rate</span><strong>{{ s.responseRatePercent }}%</strong></div>
      </div>

      <div class="card">
        <h2>By status</h2>
        @for (row of bars(); track row.status) {
          <div class="bar-row">
            <span class="bar-label">{{ row.status }}</span>
            <div class="bar-track"><div [class]="'bar-fill ' + row.status.toLowerCase()" [style.width.%]="row.percent"></div></div>
            <span class="bar-count">{{ row.count }}</span>
          </div>
        }
      </div>
    }

    <div class="card">
      <div class="page-head"><h2>Recently updated</h2><a routerLink="/applications">View all</a></div>
      @for (app of recent(); track app.id) {
        <a class="recent-row" [routerLink]="['/applications', app.id, 'edit']">
          <span><strong>{{ app.company }}</strong> · {{ app.role }}</span>
          <app-status-badge [status]="app.status" />
        </a>
      } @empty {
        <p class="muted">Nothing yet. <a routerLink="/applications/new">Add your first application</a>.</p>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApplicationsService);

  stats = signal<Stats | null>(null);
  recent = signal<JobApplication[]>([]);
  error = signal('');

  // Bar widths as % of the largest status, so the biggest bar fills the track.
  bars = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const max = Math.max(1, ...STATUSES.map((st) => s.byStatus[st]));
    return STATUSES.map((status) => ({ status, count: s.byStatus[status], percent: (100 * s.byStatus[status]) / max }));
  });

  ngOnInit(): void {
    // forkJoin = run both requests IN PARALLEL and continue when BOTH finish.
    // Like launching two std::async tasks and calling .get() on each.
    forkJoin({
      stats: this.api.stats(),
      recent: this.api.list({ sort: 'updatedAt', order: 'desc', pageSize: 5 }),
    }).subscribe({
      next: ({ stats, recent }) => {
        this.stats.set(stats);
        this.recent.set(recent.items);
      },
      error: (err) => this.error.set(readApiError(err).message),
    });
  }
}
