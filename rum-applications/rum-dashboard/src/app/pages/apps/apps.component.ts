import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-apps',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="apps-viewport animate-fade-in">
      <header class="apps-header">
        <div class="logo">
          <i class="fa-solid fa-wind brand-icon"></i>
          <h1>AURA RUM LAB</h1>
        </div>
        <p>Real-Time User Experience & Performance Telemetry Monitoring System</p>
      </header>

      <div class="apps-grid">
        <!-- Register New System -->
        <section class="glass-card animate-slide-up">
          <div class="card-icon-header">
            <i class="fa-solid fa-square-plus text-primary-color"></i>
            <h2>Register New App</h2>
          </div>
          <p class="desc">Define a new system boundary to capture Page Loads, Errors, and AJAX latencies.</p>
          
          <form (submit)="createApp()" class="form-container">
            <div class="form-group">
              <label for="appName">SYSTEM/WEBSITE NAME</label>
              <input 
                id="appName" 
                type="text" 
                class="glass-input" 
                placeholder="e.g. Production Storefront, Admin Panel" 
                [(ngModel)]="newAppName" 
                name="newAppName" 
                required 
              />
            </div>
            
            <button type="submit" class="btn-primary" [disabled]="loading()">
              <i class="fa-solid fa-shield-halved" *ngIf="!loading()"></i>
              <i class="fa-solid fa-circle-notch fa-spin" *ngIf="loading()"></i>
              <span>Generate Tracking ID</span>
            </button>
          </form>
        </section>

        <!-- Select Existing System -->
        <section class="glass-card animate-slide-up" style="animation-delay: 0.1s;">
          <div class="card-icon-header">
            <i class="fa-solid fa-folder-tree" style="color: var(--color-info);"></i>
            <h2>Monitored Systems</h2>
          </div>
          <p class="desc">Select an active system profile to browse live metrics dashboards.</p>

          <div class="apps-list">
            <div class="app-row" *ngFor="let app of applications()" (click)="selectApp(app)">
              <div class="app-row-info">
                <h3>{{ app.name }}</h3>
                <div class="api-key-badge">
                  <i class="fa-solid fa-key"></i>
                  <code>{{ app.apiKey }}</code>
                </div>
              </div>
              <i class="fa-solid fa-arrow-right-long action-arrow"></i>
            </div>

            <div class="empty-state" *ngIf="applications().length === 0">
              <i class="fa-solid fa-cubes-stacked"></i>
              <p>No registered systems yet. Use the panel on the left to add your first system!</p>
            </div>
          </div>
        </section>
      </div>

      <!-- Live Integration Guide -->
      <section class="glass-card full-width animate-slide-up" *ngIf="recentCreatedApp()" style="animation-delay: 0.2s; border-color: rgba(168, 85, 247, 0.4);">
        <div class="integration-banner">
          <i class="fa-solid fa-circle-check success-icon"></i>
          <div>
            <h2>System Registered Successfully!</h2>
            <p>Follow these quick integration steps to connect your frontend application and stream live telemetry logs.</p>
          </div>
        </div>

        <div class="guide-grid">
          <div class="guide-step">
            <h3><span>1</span> Install RUM SDK Package</h3>
            <p>Add the tracking client bundle to your host application dependencies.</p>
            <div class="code-container">
              <code>npm install &#64;rum-app/sdk</code>
              <button class="copy-btn" (click)="copyText('npm install @rum-app/sdk')">
                <i class="fa-regular fa-copy"></i>
              </button>
            </div>
          </div>

          <div class="guide-step">
            <h3><span>2</span> Initialize SDK in Main script</h3>
            <p>Initialize Aura RUM client globally at startup (e.g. in <code>main.ts</code> or <code>index.js</code>).</p>
            <div class="code-container block">
              <pre><code>import {{ '{' }} RumSDK {{ '}' }} from '&#64;rum-app/sdk';

RumSDK.init({{ '{' }}
  endpoint: 'http://localhost:5182/api/telemetry/ingest',
  applicationId: '{{ recentCreatedApp()?.apiKey }}',
  debug: true
{{ '}' }});</code></pre>
              <button class="copy-btn" (click)="copyCodeBlock()">
                <i class="fa-regular fa-copy"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="guide-footer">
          <button class="btn-primary" (click)="selectApp(recentCreatedApp())">
            <span>Proceed to Dashboard</span>
            <i class="fa-solid fa-circle-play"></i>
          </button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .apps-viewport {
      max-width: 1000px;
      margin: 80px auto;
      padding: 0 24px;
    }

    .apps-header {
      text-align: center;
      margin-bottom: 50px;
    }

    .logo {
      display: inline-flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
    }

    .brand-icon {
      font-size: 40px;
      background: linear-gradient(135deg, #a855f7, #6366f1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.3));
    }

    .apps-header h1 {
      font-size: 38px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .apps-header p {
      font-size: 15px;
      color: var(--text-secondary);
      max-width: 600px;
      margin: 0 auto;
    }

    .apps-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 32px;
    }
    @media (max-width: 768px) {
      .apps-grid {
        grid-template-columns: 1fr;
      }
    }

    .card-icon-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .card-icon-header i {
      font-size: 24px;
    }

    .text-primary-color {
      color: var(--color-primary);
    }

    .desc {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 24px;
    }

    .form-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group label {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.08em;
      display: block;
      margin-bottom: 8px;
    }

    .apps-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 240px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .app-row {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: var(--transition-fast);
    }

    .app-row:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateX(4px);
    }

    .app-row h3 {
      font-size: 14px;
      font-weight: 600;
    }

    .api-key-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      font-size: 10px;
      color: var(--text-muted);
    }

    .api-key-badge code {
      font-family: var(--font-mono);
      background: rgba(255, 255, 255, 0.04);
      padding: 1px 6px;
      border-radius: 4px;
      color: var(--color-indigo);
    }

    .action-arrow {
      color: var(--text-muted);
      font-size: 16px;
      transition: var(--transition-fast);
    }
    .app-row:hover .action-arrow {
      color: var(--color-primary);
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
    }

    .empty-state i {
      font-size: 32px;
      margin-bottom: 12px;
    }

    .empty-state p {
      font-size: 12px;
      max-width: 300px;
      margin: 0 auto;
    }

    /* Integration guide styles */
    .full-width {
      grid-column: 1 / -1;
    }

    .integration-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 16px;
    }

    .success-icon {
      font-size: 36px;
      color: var(--color-success);
      filter: drop-shadow(0 0 5px rgba(16, 185, 129, 0.3));
    }

    .guide-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    @media (max-width: 768px) {
      .guide-grid {
        grid-template-columns: 1fr;
      }
    }

    .guide-step h3 {
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .guide-step h3 span {
      background: var(--aura-primary);
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: white;
    }

    .guide-step p {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }

    .code-container {
      background: #06070a;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-sm);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
    }

    .code-container code {
      font-family: var(--font-mono);
      font-size: 12px;
      color: #34d399;
    }

    .code-container.block {
      align-items: flex-start;
    }

    .code-container.block pre {
      flex: 1;
      overflow-x: auto;
      margin: 0;
    }

    .copy-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
      transition: var(--transition-fast);
    }
    .copy-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
    }

    .guide-footer {
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 20px;
    }
  `]
})
export class AppsComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  applications = signal<any[]>([]);
  newAppName = '';
  loading = signal<boolean>(false);
  recentCreatedApp = signal<any | null>(null);

  ngOnInit() {
    this.loadApps();
  }

  loadApps() {
    this.api.getApplications().subscribe({
      next: (apps) => this.applications.set(apps)
    });
  }

  createApp() {
    if (!this.newAppName.trim()) return;
    this.loading.set(true);

    this.api.createApplication(this.newAppName).subscribe({
      next: (app) => {
        this.loading.set(false);
        this.newAppName = '';
        this.recentCreatedApp.set(app);
        this.loadApps(); // reload list
      },
      error: () => {
        this.loading.set(false);
        alert('Failed to register application. Is your API backend running?');
      }
    });
  }

  selectApp(app: any) {
    localStorage.setItem('rum_active_app_id', app.id);
    localStorage.setItem('rum_active_app_name', app.name);
    localStorage.setItem('rum_active_app_key', app.apiKey);
    this.router.navigate(['/dashboard/overview']);
  }

  copyText(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied package install instruction!');
  }

  copyCodeBlock() {
    const code = `import { RumSDK } from '@rum-app/sdk';

RumSDK.init({
  endpoint: 'http://localhost:5182/api/telemetry/ingest',
  applicationId: '${this.recentCreatedApp()?.apiKey}',
  debug: true
});`;
    navigator.clipboard.writeText(code);
    alert('Copied initialization script!');
  }
}
