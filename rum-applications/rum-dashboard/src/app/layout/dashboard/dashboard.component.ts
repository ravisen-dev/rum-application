import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="dashboard-container">
      <!-- Premium Glass Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="logo-circle">
            <i class="fa-solid fa-wind logo-icon"></i>
          </div>
          <div class="brand-text">
            <h2>AURA RUM</h2>
            <span>PERFORMANCE LAB</span>
          </div>
        </div>

        <div class="app-switcher-box">
          <label>MONITORED SYSTEM</label>
          <div class="switcher-display" (click)="toggleDropdown()">
            <i class="fa-solid fa-cube"></i>
            <span class="app-name">{{ currentAppName() }}</span>
            <i class="fa-solid fa-chevron-down arrow"></i>
          </div>
          
          <div class="switcher-dropdown" *ngIf="showDropdown()">
            <div class="dropdown-item" *ngFor="let app of applications()" (click)="selectApp(app)">
              <i class="fa-solid fa-circle rating-indicator good" style="font-size: 8px;"></i>
              <span>{{ app.name }}</span>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item link" (click)="goToAppSelector()">
              <i class="fa-solid fa-list-check"></i>
              <span>Manage Systems</span>
            </div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="overview" routerLinkActive="active" class="nav-item">
            <i class="fa-solid fa-chart-line"></i>
            <span>Overview Dashboard</span>
          </a>
          <a routerLink="vitals" routerLinkActive="active" class="nav-item">
            <i class="fa-solid fa-bolt"></i>
            <span>Web Vitals Analytics</span>
          </a>
          <a routerLink="pages" routerLinkActive="active" class="nav-item">
            <i class="fa-solid fa-file-code"></i>
            <span>Page Performance</span>
          </a>
          <a routerLink="network" routerLinkActive="active" class="nav-item">
            <i class="fa-solid fa-network-wired"></i>
            <span>Network Latency</span>
          </a>
          <a routerLink="errors" routerLinkActive="active" class="nav-item">
            <i class="fa-solid fa-bug-slash"></i>
            <span>JS Error Tracker</span>
          </a>
          <a routerLink="sessions" routerLinkActive="active" class="nav-item">
            <i class="fa-solid fa-users-viewfinder"></i>
            <span>Session Timelines</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-badge">
            <div class="avatar">RS</div>
            <div class="user-info">
              <h4>Ravi Sen</h4>
              <span>Developer Admin</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Dashboard Content -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .sidebar {
      width: 280px;
      background: rgba(14, 15, 23, 0.95);
      border-right: 1px solid var(--glass-border);
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: sticky;
      top: 0;
      backdrop-filter: blur(20px);
      z-index: 10;
    }

    .sidebar-brand {
      padding: 32px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }

    .logo-circle {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-md);
      background: var(--aura-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
    }

    .logo-icon {
      color: white;
      font-size: 20px;
    }

    .brand-text h2 {
      font-size: 18px;
      font-family: var(--font-display);
      font-weight: 800;
      letter-spacing: 0.05em;
      background: linear-gradient(to right, #a855f7, #6366f1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-text span {
      font-size: 9px;
      font-family: var(--font-display);
      font-weight: 600;
      letter-spacing: 0.15em;
      color: var(--text-muted);
      display: block;
      margin-top: 1px;
    }

    .app-switcher-box {
      padding: 20px 24px;
      position: relative;
    }

    .app-switcher-box label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      display: block;
      margin-bottom: 8px;
    }

    .switcher-display {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: var(--transition-fast);
    }

    .switcher-display:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .switcher-display i {
      color: var(--color-primary);
      font-size: 14px;
    }

    .app-name {
      flex: 1;
      font-size: 13px;
      font-weight: 600;
      font-family: var(--font-display);
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .arrow {
      font-size: 10px;
      color: var(--text-muted);
      transition: transform var(--transition-fast);
    }

    .switcher-dropdown {
      position: absolute;
      top: calc(100% - 10px);
      left: 24px;
      right: 24px;
      background: #111219;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-sm);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      z-index: 100;
      overflow: hidden;
      animation: fadeIn 0.15s ease-out;
    }

    .dropdown-item {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 13px;
      transition: var(--transition-fast);
    }

    .dropdown-item:hover {
      background: rgba(255, 255, 255, 0.04);
      color: var(--color-primary);
    }

    .dropdown-item.link {
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 500;
    }

    .dropdown-item.link i {
      color: var(--text-muted);
    }

    .dropdown-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.05);
    }

    .sidebar-nav {
      flex: 1;
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
      font-family: var(--font-display);
      transition: var(--transition-fast);
    }

    .nav-item i {
      font-size: 16px;
      width: 20px;
      text-align: center;
      color: var(--text-muted);
      transition: var(--transition-fast);
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.02);
      color: var(--text-primary);
    }

    .nav-item:hover i {
      color: var(--text-primary);
    }

    .nav-item.active {
      background: rgba(168, 85, 247, 0.08);
      color: var(--color-primary);
      border-left: 3px solid var(--color-primary);
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }

    .nav-item.active i {
      color: var(--color-primary);
    }

    .sidebar-footer {
      padding: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.03);
    }

    .user-badge {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #3b82f6);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
    }

    .user-info h4 {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .user-info span {
      font-size: 10px;
      color: var(--text-muted);
      display: block;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  applications = signal<any[]>([]);
  currentAppName = signal<string>('Select Application');
  showDropdown = signal<boolean>(false);

  ngOnInit() {
    this.loadApps();
  }

  loadApps() {
    this.api.getApplications().subscribe({
      next: (apps) => {
        this.applications.set(apps);
        
        // Pick application from localStorage or default
        const activeAppId = localStorage.getItem('rum_active_app_id');
        if (activeAppId && apps.length > 0) {
          const app = apps.find(a => a.id === activeAppId);
          if (app) {
            this.currentAppName.set(app.name);
            return;
          }
        }
        
        if (apps.length > 0) {
          this.selectApp(apps[0]);
        } else {
          this.router.navigate(['/apps']);
        }
      },
      error: () => {
        this.router.navigate(['/apps']);
      }
    });
  }

  toggleDropdown() {
    this.showDropdown.update(val => !val);
  }

  selectApp(app: any) {
    localStorage.setItem('rum_active_app_id', app.id);
    localStorage.setItem('rum_active_app_name', app.name);
    localStorage.setItem('rum_active_app_key', app.apiKey);
    this.currentAppName.set(app.name);
    this.showDropdown.set(false);
    
    // Reload state for active view
    const currentUrl = this.router.url;
    // Fast state update by navigating through reload
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
  }

  goToAppSelector() {
    this.showDropdown.set(false);
    this.router.navigate(['/apps']);
  }

  goToAppSelectorDirect() {
    this.router.navigate(['/apps']);
  }
}
