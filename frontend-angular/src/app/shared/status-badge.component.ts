// A small reusable component: a coloured pill showing an application's status.
// Usage in any template:  <app-status-badge [status]="app.status" />
import { Component, input } from '@angular/core';
import { ApplicationStatus } from '../core/models';

@Component({
  selector: 'app-status-badge',
  // Inline template/styles are fine for tiny components.
  template: `<span [class]="'badge ' + status().toLowerCase()">{{ status() }}</span>`,
  styles: `
    .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .wishlist { background: #eef1f5; color: #57606a; }
    .applied { background: #ddf4ff; color: #0969da; }
    .interviewing { background: #fff8c5; color: #9a6700; }
    .offer { background: #dafbe1; color: #1a7f37; }
    .rejected { background: #ffebe9; color: #cf222e; }
  `,
})
export class StatusBadgeComponent {
  // input.required = a value the PARENT must pass in, like a required constructor argument.
  // It's a signal, so read it by calling it: status()
  status = input.required<ApplicationStatus>();
}
