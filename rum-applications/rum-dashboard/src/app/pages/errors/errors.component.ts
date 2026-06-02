import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-errors',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="errors-viewport animate-fade-in">
      <header class="dashboard-header">
        <div>
          <h1>JS Error Tracker</h1>
          <p>Real-time client runtime exceptions and unhandled promise rejections</p>
        </div>
        <div class="time-range-selector">
          <button [class.active]="activeRange() === 7" (click)="setRange(7)">7 Days</button>
          <button [class.active]="activeRange() === 30" (click)="setRange(30)">30 Days</button>
        </div>
      </header>

      <div class="errors-layout">
        <!-- List of Grouped Errors -->
        <section class="glass-card error-list-panel animate-slide-up">
          <h2>Grouped Exceptions</h2>
          <p class="desc">Grouped by error message, origin file, and stack trace signature.</p>

          <div class="error-rows">
            <div 
              class="error-row" 
              *ngFor="let err of errors()" 
              [class.active]="selectedError() === err"
              (click)="selectError(err)"
            >
              <div class="error-row-main">
                <span class="file-name">{{ err.fileName || 'runtime-exception.js' }}</span>
                <h3 class="error-message">{{ err.message }}</h3>
              </div>
              <div class="error-row-stats">
                <span class="badge count">{{ err.occurrenceCount }} occurrences</span>
                <span class="badge users"><i class="fa-solid fa-users"></i> {{ err.affectedSessions }} affected</span>
              </div>
            </div>

            <div class="empty-state" *ngIf="errors().length === 0">
              <i class="fa-solid fa-face-smile"></i>
              <h3>0 Exceptions Reported!</h3>
              <p>Excellent visual health. No script crashes or promise failures captured.</p>
            </div>
          </div>
        </section>

        <!-- Selected Error Stack Trace Panel -->
        <section class="glass-card stack-trace-panel animate-slide-up" *ngIf="selectedError() as err" style="animation-delay: 0.1s;">
          <div class="trace-header">
            <div>
              <span class="accent-red-label">ERROR DETAIL EXPLORER</span>
              <h2>{{ err.message }}</h2>
              <span class="file-source">Found in: <code>{{ err.fileName }}</code></span>
            </div>
            <div class="date-stat">
              <span>Last Reported</span>
              <strong>{{ formatDate(err.lastSeen) }}</strong>
            </div>
          </div>

          <div class="trace-summary-grid">
            <div class="summary-box">
              <span>AFFECTED USERS</span>
              <strong>{{ err.affectedSessions }}</strong>
            </div>
            <div class="summary-box">
              <span>CRASH COUNT</span>
              <strong style="color: var(--color-danger);">{{ err.occurrenceCount }}</strong>
            </div>
          </div>

          <div class="stack-trace-view">
            <h3>Visualized Stack Trace</h3>
            <p class="desc-trace">Interactive execution frame hierarchy.</p>
            <div class="trace-console">
              <pre><code>{{ err.stackTrace || 'No stack trace details captured. Basic browser runtime warning.' }}</code></pre>
            </div>
          </div>
        </section>
      </div>
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
      margin-bottom: 16px;
    }

    .errors-layout {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 1024px) {
      .errors-layout {
        grid-template-columns: 1fr;
      }
    }

    .error-rows {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 500px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .error-row {
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 16px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: var(--transition-fast);
    }
    .error-row:hover {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.15);
    }
    .error-row.active {
      border-color: rgba(239, 68, 68, 0.4);
      background: rgba(239, 68, 68, 0.03);
    }

    .file-name {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.05em;
      display: block;
      margin-bottom: 4px;
    }

    .error-message {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      word-break: break-all;
    }
    .error-row.active .error-message {
      color: #f87171;
    }

    .error-row-stats {
      display: flex;
      gap: 12px;
    }

    .badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: var(--font-display);
    }
    .badge.count { background: rgba(239, 68, 68, 0.12); color: #f87171; }
    .badge.users { background: rgba(99, 102, 241, 0.12); color: #818cf8; }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }
    .empty-state i {
      font-size: 38px;
      margin-bottom: 12px;
      color: var(--color-success);
    }
    .empty-state h3 {
      font-size: 16px;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    /* Stack Trace Panel Styling */
    .trace-header {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }

    .accent-red-label {
      font-size: 9px;
      font-weight: 800;
      color: var(--color-danger);
      letter-spacing: 0.08em;
      display: block;
      margin-bottom: 6px;
    }

    .trace-header h2 {
      font-size: 18px;
      word-break: break-all;
      color: #f87171;
      margin-bottom: 6px;
    }

    .file-source {
      font-size: 12px;
      color: var(--text-secondary);
    }
    .file-source code {
      font-family: var(--font-mono);
      color: var(--color-indigo);
    }

    .date-stat {
      text-align: right;
    }
    .date-stat span {
      font-size: 9px;
      color: var(--text-muted);
      display: block;
      margin-bottom: 4px;
    }
    .date-stat strong {
      font-size: 12px;
      font-weight: 600;
    }

    .trace-summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 12px 16px;
    }
    .summary-box span {
      font-size: 9px;
      font-weight: 700;
      color: var(--text-muted);
      display: block;
      margin-bottom: 4px;
    }
    .summary-box strong {
      font-size: 20px;
      font-family: var(--font-display);
    }

    .stack-trace-view h3 {
      font-size: 14px;
      margin-bottom: 2px;
    }
    .desc-trace {
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 12px;
    }

    .trace-console {
      background: #06070a;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-sm);
      padding: 16px;
      overflow-x: auto;
      max-height: 280px;
    }

    .trace-console pre {
      margin: 0;
    }

    .trace-console code {
      font-family: var(--font-mono);
      font-size: 12px;
      color: #ef4444;
      line-height: 1.6;
      white-space: pre-wrap;
    }
  `]
})
export class ErrorsComponent implements OnInit {
  private api = inject(ApiService);

  appId = '';
  activeRange = signal<number>(7);
  errors = signal<any[]>([]);
  selectedError = signal<any | null>(null);

  ngOnInit() {
    this.appId = localStorage.getItem('rum_active_app_id') || '';
    this.loadErrors();
  }

  loadErrors() {
    if (!this.appId) return;

    this.api.getErrors(this.appId, this.activeRange()).subscribe({
      next: (data) => {
        this.errors.set(data);
        if (data.length > 0) {
          this.selectedError.set(data[0]);
        } else {
          this.selectedError.set(null);
        }
      }
    });
  }

  setRange(days: number) {
    this.activeRange.set(days);
    this.loadErrors();
  }

  selectError(err: any) {
    this.selectedError.set(err);
  }

  formatDate(dateString: string): string {
    const d = new Date(dateString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
