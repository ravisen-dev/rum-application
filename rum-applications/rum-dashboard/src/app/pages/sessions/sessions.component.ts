import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sessions-viewport animate-fade-in">
      <header class="dashboard-header">
        <div>
          <h1>Session Timelines</h1>
          <p>Explore individual user journeys and click-paths in chronological order</p>
        </div>
        <div class="time-range-selector">
          <button [class.active]="activeRange() === 7" (click)="setRange(7)">7 Days</button>
          <button [class.active]="activeRange() === 30" (click)="setRange(30)">30 Days</button>
        </div>
      </header>

      <div class="sessions-layout">
        <!-- Sessions List Panel -->
        <section class="glass-card sessions-list-panel animate-slide-up">
          <h2>Recent Sessions</h2>
          <p class="desc">Click any session to see its complete event timeline.</p>

          <div class="sessions-rows">
            <div
              class="session-row"
              *ngFor="let s of sessions()"
              [class.active]="selectedSession()?.id === s.id"
              (click)="loadSessionTimeline(s)"
            >
              <div class="session-device-icon">
                <i [class]="getDeviceIcon(s.deviceType)"></i>
              </div>
              <div class="session-info">
                <div class="session-meta">
                  <span class="browser-tag">{{ s.browser }}</span>
                  <span class="os-tag">{{ s.os }}</span>
                </div>
                <p class="session-time">{{ formatDate(s.createdAt) }}</p>
                <p class="session-events">{{ s.eventsCount }} events recorded</p>
              </div>
              <i class="fa-solid fa-chevron-right session-arrow"></i>
            </div>

            <div class="empty-state" *ngIf="sessions().length === 0">
              <i class="fa-solid fa-user-slash"></i>
              <h3>No sessions recorded</h3>
              <p>Sessions appear once users interact with your integrated application.</p>
            </div>
          </div>
        </section>

        <!-- Timeline Drilldown Panel -->
        <section class="glass-card timeline-panel animate-slide-up" *ngIf="selectedSession()" style="animation-delay: 0.1s;">
          <div class="timeline-header">
            <div>
              <span class="timeline-label">SESSION TIMELINE EXPLORER</span>
              <h2>{{ selectedSession()?.browser }} on {{ selectedSession()?.os }}</h2>
              <p class="resolution">{{ selectedSession()?.resolution }} · {{ selectedSession()?.referrer }}</p>
            </div>
            <div class="total-events-badge">
              <span>{{ timeline().length }}</span>
              <p>TOTAL EVENTS</p>
            </div>
          </div>

          <div class="timeline-events" *ngIf="timeline().length > 0">
            <div class="timeline-event" *ngFor="let event of timeline(); let i = index">
              <!-- Timeline Line -->
              <div class="timeline-connector">
                <div class="timeline-dot" [ngClass]="getEventColorClass(event.type)">
                  <i [class]="getEventIcon(event.type)"></i>
                </div>
                <div class="timeline-line" *ngIf="i < timeline().length - 1"></div>
              </div>

              <!-- Event Content -->
              <div class="event-content">
                <div class="event-header">
                  <span class="event-type-label" [ngClass]="getEventColorClass(event.type)">
                    {{ getEventTypeLabel(event.type) }}
                  </span>
                  <span class="event-time">{{ formatTime(event.timestamp) }}</span>
                </div>

                <div class="event-details">
                  <p class="event-path">
                    <i class="fa-solid fa-location-dot"></i>
                    {{ event.path || '/' }}
                  </p>

                  <!-- Page View Details -->
                  <div *ngIf="event.type === 'pageview'">
                    <p>{{ event.title }}</p>
                    <p class="event-extra" *ngIf="event.durationMs">⏱ {{ event.durationMs }}ms time on page</p>
                  </div>

                  <!-- Web Vital Details -->
                  <div *ngIf="event.type === 'webvital'">
                    <p><strong>{{ event.metricName }}</strong> = {{ event.value }}{{ event.metricName === 'CLS' ? '' : 'ms' }}</p>
                    <span class="status-badge" [ngClass]="event.rating">{{ event.rating }}</span>
                  </div>

                  <!-- Network Request Details -->
                  <div *ngIf="event.type === 'network'">
                    <p>
                      <span class="http-badge-sm" [ngClass]="event.method?.toLowerCase()">{{ event.method }}</span>
                      <code class="url-mono">{{ event.url }}</code>
                    </p>
                    <p class="event-extra">
                      HTTP {{ event.statusCode }} · {{ event.durationMs }}ms
                    </p>
                  </div>

                  <!-- Error Details -->
                  <div *ngIf="event.type === 'error'" class="error-event">
                    <p class="error-msg">{{ event.message }}</p>
                    <p class="event-extra" *ngIf="event.fileName">in {{ event.fileName }}</p>
                  </div>

                  <!-- User Event (Click) Details -->
                  <div *ngIf="event.type === 'event'">
                    <p>{{ event.eventType === 'custom' ? 'Custom: ' + event.elementTag : 'Clicked ' + (event.elementTag || 'element') }}</p>
                    <p class="event-extra" *ngIf="event.elementId">#{{ event.elementId }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="timeline-empty" *ngIf="timeline().length === 0 && !loadingTimeline()">
            <i class="fa-solid fa-timeline"></i>
            <p>No events found for this session.</p>
          </div>

          <div class="timeline-loading" *ngIf="loadingTimeline()">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <p>Loading timeline...</p>
          </div>
        </section>

        <!-- Default empty state when no session selected -->
        <section class="glass-card timeline-panel placeholder-panel animate-slide-up" *ngIf="!selectedSession() && sessions().length > 0">
          <i class="fa-solid fa-users-viewfinder"></i>
          <h3>Select a Session</h3>
          <p>Choose a session from the list on the left to view its complete chronological activity log.</p>
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
      background: none; border: none;
      color: var(--text-secondary);
      font-size: 12px; font-family: var(--font-display); font-weight: 600;
      padding: 6px 16px; border-radius: 4px; cursor: pointer;
      transition: var(--transition-fast);
    }

    .time-range-selector button.active {
      background: var(--aura-primary); color: white;
    }

    .desc { font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; }

    .sessions-layout {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 1024px) {
      .sessions-layout { grid-template-columns: 1fr; }
    }

    .sessions-rows {
      display: flex; flex-direction: column; gap: 10px;
      max-height: 560px; overflow-y: auto; padding-right: 4px;
    }

    .session-row {
      display: flex; align-items: center; gap: 14px;
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 14px 16px; cursor: pointer;
      transition: var(--transition-fast);
    }
    .session-row:hover {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.15);
    }
    .session-row.active {
      border-color: rgba(168, 85, 247, 0.4);
      background: rgba(168, 85, 247, 0.04);
    }

    .session-device-icon {
      width: 40px; height: 40px; border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--glass-border);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; color: var(--text-secondary);
    }

    .session-info { flex: 1; min-width: 0; }

    .session-meta { display: flex; gap: 8px; margin-bottom: 4px; }

    .browser-tag, .os-tag {
      font-size: 10px; font-weight: 600; padding: 2px 6px;
      border-radius: 4px; font-family: var(--font-display);
    }
    .browser-tag { background: rgba(6, 182, 212, 0.15); color: var(--color-info); }
    .os-tag { background: rgba(168, 85, 247, 0.15); color: var(--color-primary); }

    .session-time { font-size: 11px; color: var(--text-muted); }
    .session-events { font-size: 11px; color: var(--text-secondary); }
    .session-arrow { font-size: 12px; color: var(--text-muted); }
    .session-row.active .session-arrow { color: var(--color-primary); }

    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
    .empty-state i { font-size: 38px; margin-bottom: 12px; }
    .empty-state h3 { font-size: 16px; color: var(--text-primary); margin-bottom: 4px; }

    /* Timeline Panel */
    .timeline-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 20px; margin-bottom: 24px;
    }
    .timeline-label {
      font-size: 9px; font-weight: 800; color: var(--color-primary);
      letter-spacing: 0.08em; display: block; margin-bottom: 6px;
    }
    .timeline-header h2 { font-size: 18px; margin-bottom: 4px; }
    .resolution { font-size: 11px; color: var(--text-muted); }

    .total-events-badge {
      text-align: center;
      background: rgba(168, 85, 247, 0.1);
      border: 1px solid rgba(168, 85, 247, 0.2);
      border-radius: var(--radius-md);
      padding: 12px 20px; min-width: 80px;
    }
    .total-events-badge span { font-size: 28px; font-weight: 800; color: var(--color-primary); display: block; }
    .total-events-badge p { font-size: 9px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.08em; }

    .timeline-events {
      max-height: 560px; overflow-y: auto;
      display: flex; flex-direction: column; gap: 0;
      padding-right: 4px;
    }

    .timeline-event {
      display: flex; gap: 16px; position: relative;
    }

    .timeline-connector {
      display: flex; flex-direction: column; align-items: center;
      width: 36px; flex-shrink: 0;
    }

    .timeline-dot {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; flex-shrink: 0;
    }

    .timeline-dot.pageview { background: rgba(6, 182, 212, 0.2); color: var(--color-info); border: 2px solid rgba(6, 182, 212, 0.3); }
    .timeline-dot.webvital { background: rgba(168, 85, 247, 0.2); color: var(--color-primary); border: 2px solid rgba(168, 85, 247, 0.3); }
    .timeline-dot.network { background: rgba(99, 102, 241, 0.2); color: var(--color-indigo); border: 2px solid rgba(99, 102, 241, 0.3); }
    .timeline-dot.error { background: rgba(239, 68, 68, 0.2); color: var(--color-danger); border: 2px solid rgba(239, 68, 68, 0.3); }
    .timeline-dot.event { background: rgba(16, 185, 129, 0.2); color: var(--color-success); border: 2px solid rgba(16, 185, 129, 0.3); }

    .timeline-line {
      flex: 1; width: 2px; background: rgba(255, 255, 255, 0.05);
      min-height: 24px;
    }

    .event-content {
      flex: 1; padding-bottom: 20px; min-width: 0;
    }

    .event-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }

    .event-type-label {
      font-size: 10px; font-weight: 700; font-family: var(--font-display);
      padding: 2px 8px; border-radius: 4px; text-transform: uppercase;
    }
    .event-type-label.pageview { background: rgba(6, 182, 212, 0.12); color: var(--color-info); }
    .event-type-label.webvital { background: rgba(168, 85, 247, 0.12); color: var(--color-primary); }
    .event-type-label.network { background: rgba(99, 102, 241, 0.12); color: var(--color-indigo); }
    .event-type-label.error { background: rgba(239, 68, 68, 0.12); color: var(--color-danger); }
    .event-type-label.event { background: rgba(16, 185, 129, 0.12); color: var(--color-success); }

    .event-time { font-size: 11px; color: var(--text-muted); }

    .event-details {
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      font-size: 13px;
    }

    .event-path {
      font-size: 11px; color: var(--text-muted);
      margin-bottom: 6px; display: flex; align-items: center; gap: 6px;
    }
    .event-path i { font-size: 10px; }

    .event-extra { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

    .http-badge-sm {
      font-size: 9px; font-weight: 700;
      padding: 2px 6px; border-radius: 3px;
      margin-right: 8px;
      font-family: var(--font-display);
    }
    .http-badge-sm.get { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .http-badge-sm.post { background: rgba(99, 102, 241, 0.15); color: #6366f1; }
    .http-badge-sm.put { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
    .http-badge-sm.delete { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

    .url-mono { font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); word-break: break-all; }

    .error-msg { color: #f87171; font-weight: 600; word-break: break-all; }

    .status-badge {
      display: inline-flex; align-items: center;
      font-size: 10px; font-weight: 700;
      padding: 2px 8px; border-radius: 4px;
      text-transform: uppercase;
    }
    .status-badge.good { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .status-badge.needs-improvement { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .status-badge.poor { background: rgba(239, 68, 68, 0.15); color: #f87171; }

    .timeline-empty, .timeline-loading {
      text-align: center; padding: 60px 20px; color: var(--text-muted);
    }
    .timeline-empty i, .timeline-loading i { font-size: 28px; margin-bottom: 12px; }

    /* Placeholder panel */
    .placeholder-panel {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center; min-height: 300px;
      color: var(--text-muted);
    }
    .placeholder-panel i { font-size: 48px; margin-bottom: 16px; }
    .placeholder-panel h3 { color: var(--text-primary); font-size: 18px; margin-bottom: 8px; }
    .placeholder-panel p { font-size: 13px; max-width: 300px; }
  `]
})
export class SessionsComponent implements OnInit {
  private api = inject(ApiService);

  appId = '';
  activeRange = signal<number>(7);
  sessions = signal<any[]>([]);
  selectedSession = signal<any | null>(null);
  timeline = signal<any[]>([]);
  loadingTimeline = signal<boolean>(false);

  ngOnInit() {
    this.appId = localStorage.getItem('rum_active_app_id') || '';
    this.loadSessions();
  }

  loadSessions() {
    if (!this.appId) return;
    this.api.getSessions(this.appId, this.activeRange()).subscribe({
      next: (data) => this.sessions.set(data)
    });
  }

  setRange(days: number) {
    this.activeRange.set(days);
    this.selectedSession.set(null);
    this.timeline.set([]);
    this.loadSessions();
  }

  loadSessionTimeline(session: any) {
    this.selectedSession.set(session);
    this.loadingTimeline.set(true);
    this.timeline.set([]);

    this.api.getSessionDetails(session.id).subscribe({
      next: (data) => {
        this.timeline.set(data.timeline || []);
        this.loadingTimeline.set(false);
      },
      error: () => {
        this.loadingTimeline.set(false);
      }
    });
  }

  getDeviceIcon(deviceType: string): string {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return 'fa-solid fa-mobile-screen-button';
      case 'tablet': return 'fa-solid fa-tablet-screen-button';
      default: return 'fa-solid fa-desktop';
    }
  }

  getEventIcon(type: string): string {
    switch (type) {
      case 'pageview': return 'fa-solid fa-file-lines';
      case 'webvital': return 'fa-solid fa-bolt';
      case 'network': return 'fa-solid fa-cloud-arrow-up';
      case 'error': return 'fa-solid fa-circle-exclamation';
      case 'event': return 'fa-solid fa-computer-mouse';
      default: return 'fa-solid fa-circle';
    }
  }

  getEventColorClass(type: string): string {
    return type || 'event';
  }

  getEventTypeLabel(type: string): string {
    switch (type) {
      case 'pageview': return 'Page View';
      case 'webvital': return 'Web Vital';
      case 'network': return 'API Call';
      case 'error': return 'Exception';
      case 'event': return 'User Action';
      default: return type;
    }
  }

  formatDate(dateString: string): string {
    const d = new Date(dateString);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString(undefined, {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
}
