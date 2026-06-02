import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-pages-perf',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pages-perf-viewport animate-fade-in">
      <header class="dashboard-header">
        <div>
          <h1>Page Performance</h1>
          <p>Real-user load times and hit metrics grouped by URL route</p>
        </div>
        <div class="time-range-selector">
          <button [class.active]="activeRange() === 7" (click)="setRange(7)">7 Days</button>
          <button [class.active]="activeRange() === 30" (click)="setRange(30)">30 Days</button>
        </div>
      </header>

      <!-- Page breakdown card -->
      <section class="glass-card animate-slide-up">
        <h2>Performance Breakdown by Path</h2>
        <p class="desc">A sorted index of your application paths, aggregating visitor volume and load latencies.</p>

        <div class="table-container">
          <table class="glass-table">
            <thead>
              <tr>
                <th>PAGE URL PATH</th>
                <th>TOTAL VIEWS</th>
                <th>AVG LOAD TIME</th>
                <th>STATUS RATING</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of pages()">
                <td class="path-cell">
                  <i class="fa-solid fa-link"></i>
                  <code>{{ p.path }}</code>
                </td>
                <td class="views-cell">{{ formatNumber(p.viewsCount) }}</td>
                <td class="duration-cell">
                  <strong>{{ p.avgDurationMs }}</strong> <span class="ms-label">ms</span>
                </td>
                <td>
                  <span class="status-badge" [ngClass]="getDurationRating(p.avgDurationMs)">
                    <span class="rating-indicator" [ngClass]="getDurationRating(p.avgDurationMs)"></span>
                    {{ getRatingText(p.avgDurationMs) }}
                  </span>
                </td>
              </tr>

              <tr *ngIf="pages().length === 0">
                <td colspan="4" class="table-empty">
                  <i class="fa-solid fa-ban"></i>
                  <p>No page view telemetry captured yet.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      padding-bottom: 20px;
    }

    .time-range-selector {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 4px;
      display: flex;
      gap: 4px;
    }

    .time-range-selector button {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 12px;
      font-family: var(--font-display);
      font-weight: 600;
      padding: 6px 16px;
      border-radius: 4px;
      cursor: pointer;
      transition: var(--transition-fast);
    }

    .time-range-selector button.active {
      background: var(--aura-primary);
      color: white;
    }

    .desc {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 24px;
    }

    .path-cell {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 500;
    }

    .path-cell i {
      color: var(--text-muted);
      font-size: 12px;
    }

    .path-cell code {
      font-family: var(--font-mono);
      color: var(--color-indigo);
    }

    .views-cell {
      font-weight: 600;
    }

    .duration-cell {
      font-family: var(--font-display);
    }

    .ms-label {
      font-size: 11px;
      color: var(--text-muted);
    }

    .table-empty {
      text-align: center;
      padding: 40px !important;
      color: var(--text-muted);
    }

    .table-empty i {
      font-size: 28px;
      margin-bottom: 10px;
    }
  `]
})
export class PagesComponent implements OnInit {
  private api = inject(ApiService);

  appId = '';
  activeRange = signal<number>(7);
  pages = signal<any[]>([]);

  ngOnInit() {
    this.appId = localStorage.getItem('rum_active_app_id') || '';
    this.loadPages();
  }

  loadPages() {
    if (!this.appId) return;

    this.api.getPages(this.appId, this.activeRange()).subscribe({
      next: (data) => this.pages.set(data)
    });
  }

  setRange(days: number) {
    this.activeRange.set(days);
    this.loadPages();
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
  }

  getDurationRating(durationMs: number): 'good' | 'warning' | 'poor' {
    if (durationMs <= 1500) return 'good';
    if (durationMs <= 3000) return 'warning';
    return 'poor';
  }

  getRatingText(durationMs: number): string {
    if (durationMs <= 1500) return 'Fast';
    if (durationMs <= 3000) return 'Moderate';
    return 'Slow';
  }
}
