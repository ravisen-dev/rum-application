import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

interface WebVitalStat {
  metricName: string;
  avgValue: number;
  totalCount: number;
  goodCount: number;
  needsImprovementCount: number;
  poorCount: number;
  goodPercentage: number;
  needsImprovementPercentage: number;
  poorPercentage: number;
}

@Component({
  selector: 'app-vitals',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="vitals-viewport animate-fade-in">
      <header class="dashboard-header">
        <div>
          <h1>Core Web Vitals</h1>
          <p>Real-user loading experience and interactivity indexes</p>
        </div>
        <div class="time-range-selector">
          <button [class.active]="activeRange() === 7" (click)="setRange(7)">7 Days</button>
          <button [class.active]="activeRange() === 30" (click)="setRange(30)">30 Days</button>
        </div>
      </header>

      <!-- Explanation banner -->
      <section class="glass-card banner-card animate-slide-up">
        <i class="fa-solid fa-circle-info banner-icon"></i>
        <div>
          <h3>Understanding Web Vitals</h3>
          <p>Core Web Vitals are a set of real-world, user-centered metrics that Google uses to quantify key aspects of the user experience: loading speed (LCP), responsiveness (FID/INP), and visual stability (CLS).</p>
        </div>
      </section>

      <!-- Web Vitals Cards Grid -->
      <div class="vitals-grid">
        <div class="glass-card vital-card animate-slide-up" *ngFor="let m of metrics(); let idx = index" [style.animation-delay]="(idx * 0.05) + 's'">
          <div class="vital-card-header">
            <div>
              <h2>{{ m.metricName }}</h2>
              <span class="full-name">{{ getMetricFullName(m.metricName) }}</span>
            </div>
            <div class="vital-badge" [ngClass]="getGlobalRating(m)">
              {{ getRatingLabel(getGlobalRating(m)) }}
            </div>
          </div>

          <div class="vital-value-section">
            <span class="value">{{ m.avgValue }}</span>
            <span class="unit">{{ getMetricUnit(m.metricName) }}</span>
          </div>

          <!-- Distribution Stacked Bar -->
          <div class="distribution-section">
            <div class="distribution-header">
              <span>USER EXPERIENCE DISTRIBUTION</span>
              <span>{{ m.totalCount }} samples</span>
            </div>
            <div class="stacked-bar">
              <div class="bar-segment good" [style.width]="m.goodPercentage + '%'" [title]="'Good: ' + m.goodPercentage + '%'"></div>
              <div class="bar-segment warning" [style.width]="m.needsImprovementPercentage + '%'" [title]="'Needs Imp: ' + m.needsImprovementPercentage + '%'"></div>
              <div class="bar-segment poor" [style.width]="m.poorPercentage + '%'" [title]="'Poor: ' + m.poorPercentage + '%'"></div>
            </div>
            <div class="legend-labels">
              <span class="leg-label good"><span class="dot"></span>Good ({{ m.goodPercentage }}%)</span>
              <span class="leg-label warning"><span class="dot"></span>Needs Imp. ({{ m.needsImprovementPercentage }}%)</span>
              <span class="leg-label poor"><span class="dot"></span>Poor ({{ m.poorPercentage }}%)</span>
            </div>
          </div>
        </div>

        <div class="empty-state-card glass-card full-width" *ngIf="metrics().length === 0">
          <i class="fa-solid fa-gauge-high"></i>
          <h3>No Web Vitals telemetry captured yet</h3>
          <p>Deploy the RUM SDK to production or open your integrated client page and trigger some interactions to populate this view.</p>
        </div>
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

    /* Explanation banner styling */
    .banner-card {
      display: flex;
      align-items: center;
      gap: 20px;
      border-left: 4px solid var(--color-primary);
      margin-bottom: 32px;
      padding: 20px 24px;
    }

    .banner-icon {
      font-size: 28px;
      color: var(--color-primary);
    }

    .banner-card h3 {
      font-size: 15px;
      margin-bottom: 4px;
    }

    .banner-card p {
      font-size: 12px;
      color: var(--text-secondary);
      max-width: 800px;
      line-height: 1.6;
    }

    /* Grid cards */
    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .vital-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 260px;
    }

    .vital-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .vital-card-header h2 {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    .full-name {
      font-size: 11px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .vital-badge {
      font-family: var(--font-display);
      font-size: 10px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
    }

    .vital-badge.good { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .vital-badge.warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .vital-badge.poor { background: rgba(239, 68, 68, 0.15); color: #f87171; }

    .vital-value-section {
      margin-bottom: 24px;
    }

    .vital-value-section .value {
      font-family: var(--font-display);
      font-size: 38px;
      font-weight: 800;
      color: var(--text-primary);
    }

    .vital-value-section .unit {
      font-size: 13px;
      color: var(--text-secondary);
      margin-left: 4px;
    }

    /* Distribution bar styling */
    .distribution-section {
      margin-top: auto;
    }

    .distribution-header {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .stacked-bar {
      height: 8px;
      border-radius: var(--radius-full);
      display: flex;
      overflow: hidden;
      background: var(--bg-tertiary);
      margin-bottom: 12px;
    }

    .bar-segment {
      height: 100%;
      transition: width 0.5s ease-out;
    }

    .bar-segment.good { background: var(--color-success); }
    .bar-segment.warning { background: var(--color-warning); }
    .bar-segment.poor { background: var(--color-danger); }

    .legend-labels {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }

    .leg-label {
      font-size: 10px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .leg-label span.dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }

    .leg-label.good { color: #34d399; }
    .leg-label.good span.dot { background-color: var(--color-success); }
    .leg-label.warning { color: #fbbf24; }
    .leg-label.warning span.dot { background-color: var(--color-warning); }
    .leg-label.poor { color: #f87171; }
    .leg-label.poor span.dot { background-color: var(--color-danger); }

    .empty-state-card {
      text-align: center;
      padding: 60px 40px;
      color: var(--text-muted);
      grid-column: 1 / -1;
    }

    .empty-state-card i {
      font-size: 42px;
      margin-bottom: 16px;
      color: var(--text-muted);
    }

    .empty-state-card h3 {
      font-size: 16px;
      margin-bottom: 6px;
      color: var(--text-primary);
    }
  `]
})
export class VitalsComponent implements OnInit {
  private api = inject(ApiService);

  appId = '';
  activeRange = signal<number>(7);
  metrics = signal<WebVitalStat[]>([]);

  ngOnInit() {
    this.appId = localStorage.getItem('rum_active_app_id') || '';
    this.loadWebVitals();
  }

  loadWebVitals() {
    if (!this.appId) return;

    this.api.getWebVitals(this.appId, this.activeRange()).subscribe({
      next: (data) => this.metrics.set(data as WebVitalStat[])
    });
  }

  setRange(days: number) {
    this.activeRange.set(days);
    this.loadWebVitals();
  }

  getMetricFullName(name: string): string {
    switch (name.toUpperCase()) {
      case 'LCP': return 'Largest Contentful Paint (Loading)';
      case 'FID': return 'First Input Delay (Responsiveness)';
      case 'CLS': return 'Cumulative Layout Shift (Stability)';
      case 'INP': return 'Interaction to Next Paint (Responsiveness)';
      case 'TTFB': return 'Time to First Byte (Server speed)';
      case 'FCP': return 'First Contentful Paint (Visual load)';
      default: return 'Core Metric';
    }
  }

  getMetricUnit(name: string): string {
    switch (name.toUpperCase()) {
      case 'CLS': return ''; // decimal
      default: return 'ms';
    }
  }

  getGlobalRating(m: WebVitalStat): 'good' | 'warning' | 'poor' {
    if (m.goodPercentage >= 70) return 'good';
    if (m.poorPercentage >= 25) return 'poor';
    return 'warning';
  }

  getRatingLabel(rating: 'good' | 'warning' | 'poor'): string {
    switch (rating) {
      case 'good': return 'Healthy';
      case 'warning': return 'Needs Imp.';
      case 'poor': return 'Poor Experience';
    }
  }
}
