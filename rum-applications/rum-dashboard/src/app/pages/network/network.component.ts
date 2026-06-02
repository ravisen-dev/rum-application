import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-network-perf',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="network-perf-viewport animate-fade-in">
      <header class="dashboard-header">
        <div>
          <h1>Network Latency & APIs</h1>
          <p>Real-time analytics for outbound fetch and XHR requests</p>
        </div>
        <div class="time-range-selector">
          <button [class.active]="activeRange() === 7" (click)="setRange(7)">7 Days</button>
          <button [class.active]="activeRange() === 30" (click)="setRange(30)">30 Days</button>
        </div>
      </header>

      <!-- Network breakdown card -->
      <section class="glass-card animate-slide-up">
        <h2>Slowest & Frequent Outbound Endpoints</h2>
        <p class="desc">A structured analysis of external API dependencies, detailing count, response speed, and error rates.</p>

        <div class="table-container">
          <table class="glass-table">
            <thead>
              <tr>
                <th>HTTP METHOD</th>
                <th>ENDPOINT API URL</th>
                <th>REQUEST COUNT</th>
                <th>AVG RESPONSE LATENCY</th>
                <th>API ERROR RATE</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let nr of requests()">
                <td>
                  <span class="http-badge" [ngClass]="nr.method.toLowerCase()">
                    {{ nr.method.toUpperCase() }}
                  </span>
                </td>
                <td class="url-cell">
                  <code>{{ nr.url }}</code>
                </td>
                <td>{{ formatNumber(nr.requestCount) }}</td>
                <td class="duration-cell">
                  <strong>{{ nr.avgDurationMs }}</strong> <span class="ms-label">ms</span>
                </td>
                <td>
                  <span class="error-rate-badge" [ngClass]="getErrorClass(nr.errorRate)">
                    {{ nr.errorRate }}%
                  </span>
                </td>
              </tr>

              <tr *ngIf="requests().length === 0">
                <td colspan="5" class="table-empty">
                  <i class="fa-solid fa-cloud-bolt"></i>
                  <p>No outbound network calls tracked yet.</p>
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

    .http-badge {
      display: inline-block;
      font-family: var(--font-display);
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 4px;
      text-align: center;
      width: 58px;
    }

    .http-badge.get { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
    .http-badge.post { background: rgba(99, 102, 241, 0.15); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.2); }
    .http-badge.put { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
    .http-badge.delete { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }

    .url-cell code {
      font-family: var(--font-mono);
      color: var(--text-primary);
      word-break: break-all;
    }

    .duration-cell {
      font-family: var(--font-display);
    }

    .ms-label {
      font-size: 11px;
      color: var(--text-muted);
    }

    .error-rate-badge {
      font-family: var(--font-display);
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .error-rate-badge.good { background: rgba(16, 185, 129, 0.1); color: #34d399; }
    .error-rate-badge.warning { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }
    .error-rate-badge.poor { background: rgba(239, 68, 68, 0.1); color: #f87171; }

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
export class NetworkComponent implements OnInit {
  private api = inject(ApiService);

  appId = '';
  activeRange = signal<number>(7);
  requests = signal<any[]>([]);

  ngOnInit() {
    this.appId = localStorage.getItem('rum_active_app_id') || '';
    this.loadNetworkStats();
  }

  loadNetworkStats() {
    if (!this.appId) return;

    this.api.getNetwork(this.appId, this.activeRange()).subscribe({
      next: (data) => this.requests.set(data)
    });
  }

  setRange(days: number) {
    this.activeRange.set(days);
    this.loadNetworkStats();
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
  }

  getErrorClass(rate: number): 'good' | 'warning' | 'poor' {
    if (rate <= 1) return 'good';
    if (rate <= 5) return 'warning';
    return 'poor';
  }
}
