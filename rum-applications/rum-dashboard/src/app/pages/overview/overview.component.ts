import { Component, OnInit, AfterViewInit, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overview-container animate-fade-in">
      <header class="dashboard-header">
        <div>
          <h1>System Overview</h1>
          <p>Real-time analytics for <strong>{{ appName }}</strong></p>
        </div>
        <div class="time-range-selector">
          <button [class.active]="activeRange() === 7" (click)="setRange(7)">7 Days</button>
          <button [class.active]="activeRange() === 30" (click)="setRange(30)">30 Days</button>
        </div>
      </header>

      <!-- KPI Metrics Grid -->
      <div class="metrics-grid">
        <div class="glass-card metric-card">
          <div class="metric-icon views">
            <i class="fa-regular fa-eye"></i>
          </div>
          <div class="metric-data">
            <span>TOTAL PAGE VIEWS</span>
            <h3>{{ formatNumber(stats().totalPageViews) }}</h3>
          </div>
        </div>

        <div class="glass-card metric-card">
          <div class="metric-icon load-time">
            <i class="fa-regular fa-clock"></i>
          </div>
          <div class="metric-data">
            <span>AVG PAGE LOAD</span>
            <h3>{{ stats().avgLoadTime }} ms</h3>
          </div>
        </div>

        <div class="glass-card metric-card">
          <div class="metric-icon errors">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div class="metric-data">
            <span>ERROR RATE</span>
            <h3>{{ stats().errorRate }} %</h3>
          </div>
        </div>

        <div class="glass-card metric-card">
          <div class="metric-icon sessions">
            <i class="fa-solid fa-user-astronaut"></i>
          </div>
          <div class="metric-data">
            <span>ACTIVE SESSIONS</span>
            <h3>{{ formatNumber(stats().activeSessions) }}</h3>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="dashboard-grid">
        <div class="glass-card chart-card">
          <h2>Page Views Trend</h2>
          <p class="chart-subtitle">Daily frequency of page views over the active monitoring range.</p>
          <div class="canvas-container">
            <canvas #viewsChart></canvas>
          </div>
        </div>

        <div class="glass-card chart-card">
          <h2>Error Occurrences</h2>
          <p class="chart-subtitle">Daily count of unhandled exceptions reported.</p>
          <div class="canvas-container">
            <canvas #errorsChart></canvas>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
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

    .time-range-selector button:hover {
      color: var(--text-primary);
    }

    .time-range-selector button.active {
      background: var(--aura-primary);
      color: white;
      box-shadow: 0 2px 8px rgba(168, 85, 247, 0.2);
    }

    /* KPI styling */
    .metric-card {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .metric-icon {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }

    .metric-icon.views {
      background: rgba(6, 182, 212, 0.15);
      color: var(--color-info);
      border: 1px solid rgba(6, 182, 212, 0.2);
    }

    .metric-icon.load-time {
      background: rgba(99, 102, 241, 0.15);
      color: var(--color-indigo);
      border: 1px solid rgba(99, 102, 241, 0.2);
    }

    .metric-icon.errors {
      background: rgba(239, 68, 68, 0.15);
      color: var(--color-danger);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .metric-icon.sessions {
      background: rgba(16, 185, 129, 0.15);
      color: var(--color-success);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .metric-data span {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      display: block;
      margin-bottom: 4px;
    }

    .metric-data h3 {
      font-size: 24px;
      font-weight: 800;
    }

    /* Charts styling */
    .chart-card h2 {
      font-size: 18px;
      margin-bottom: 4px;
    }

    .chart-subtitle {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 24px;
    }

    .canvas-container {
      position: relative;
      height: 280px;
      width: 100%;
    }
  `]
})
export class OverviewComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);

  appName = '';
  appId = '';
  activeRange = signal<number>(7);
  stats = signal<any>({
    totalPageViews: 0,
    activeSessions: 0,
    avgLoadTime: 0,
    errorRate: 0,
    viewsOverTime: [],
    errorsOverTime: []
  });

  @ViewChild('viewsChart') viewsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('errorsChart') errorsChartRef!: ElementRef<HTMLCanvasElement>;

  private viewsChartInstance: Chart | null = null;
  private errorsChartInstance: Chart | null = null;

  ngOnInit() {
    this.appName = localStorage.getItem('rum_active_app_name') || 'No System Active';
    this.appId = localStorage.getItem('rum_active_app_id') || '';
    this.loadStats();
  }

  ngAfterViewInit() {
    // Initial draw handles are triggered upon loadStats response
  }

  loadStats() {
    if (!this.appId) return;

    this.api.getOverview(this.appId, this.activeRange()).subscribe({
      next: (data) => {
        this.stats.set(data);
        this.renderCharts(data);
      }
    });
  }

  setRange(days: number) {
    this.activeRange.set(days);
    this.loadStats();
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
  }

  renderCharts(data: any) {
    // 1. Render Views Trend
    if (this.viewsChartRef) {
      if (this.viewsChartInstance) this.viewsChartInstance.destroy();

      const dates = data.viewsOverTime.map((v: any) => v.date);
      const counts = data.viewsOverTime.map((v: any) => v.count);

      this.viewsChartInstance = new Chart(this.viewsChartRef.nativeElement, {
        type: 'line',
        data: {
          labels: dates.length ? dates : ['No Data'],
          datasets: [{
            label: 'Page Views',
            data: counts.length ? counts : [0],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.05)',
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#06b6d4',
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#9ca3af' } },
            x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
          }
        }
      });
    }

    // 2. Render Errors Trend
    if (this.errorsChartRef) {
      if (this.errorsChartInstance) this.errorsChartInstance.destroy();

      const dates = data.errorsOverTime.map((e: any) => e.date);
      const counts = data.errorsOverTime.map((e: any) => e.count);

      this.errorsChartInstance = new Chart(this.errorsChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: dates.length ? dates : ['No Data'],
          datasets: [{
            label: 'Exceptions',
            data: counts.length ? counts : [0],
            backgroundColor: 'rgba(239, 68, 68, 0.4)',
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#9ca3af' } },
            x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
          }
        }
      });
    }
  }
}
