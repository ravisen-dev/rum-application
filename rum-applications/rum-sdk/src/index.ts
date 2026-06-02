import { RumConfig, RumEvent, PageViewEvent } from './types';
import { SessionManager } from './session';
import { TelemetryQueue } from './queue';
import { WebVitalsCollector } from './vitals';
import { ErrorTracker } from './errors';
import { NetworkTracker } from './network';
import { UserActionTracker } from './events';

export class RumSDK {
  private static instance: RumSDK | null = null;
  private config: RumConfig;
  private sessionManager: SessionManager;
  private queue: TelemetryQueue;
  private currentPath: string = '';
  private pageStartTime: number = performance.now();

  private constructor(config: RumConfig) {
    this.config = {
      sampleRate: 1.0,
      debug: false,
      batchIntervalMs: 5000,
      maxQueueSize: 20,
      ...config
    };

    if (this.config.debug) {
      console.log('[RUM SDK] Initializing...');
    }

    this.sessionManager = new SessionManager();
    this.queue = new TelemetryQueue(this.config, this.sessionManager.getContext());
    this.currentPath = this.getPathName();

    this.initTrackors();
    this.initSpaRouting();
    this.trackPageView(true); // Initial page view
  }

  public static init(config: RumConfig): RumSDK {
    if (!RumSDK.instance) {
      RumSDK.instance = new RumSDK(config);
    }
    return RumSDK.instance;
  }

  public static getInstance(): RumSDK {
    if (!RumSDK.instance) {
      throw new Error('[RUM SDK] Not initialized. Call RumSDK.init(config) first.');
    }
    return RumSDK.instance;
  }

  private getPathName(): string {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname || '/';
  }

  private initTrackors(): void {
    const queueEvent = (event: Omit<RumEvent, 'timestamp' | 'path'>) => {
      const fullEvent: RumEvent = {
        ...event,
        timestamp: new Date().toISOString(),
        path: this.currentPath
      } as RumEvent;
      this.queue.enqueue(fullEvent);
    };

    // Initialize trackers
    new WebVitalsCollector(queueEvent);
    new ErrorTracker(queueEvent);
    new NetworkTracker(this.config.endpoint, queueEvent);
    new UserActionTracker(queueEvent);
  }

  private initSpaRouting(): void {
    if (typeof window === 'undefined') return;

    const self = this;
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (data: any, unused: string, url?: string | URL | null) {
      originalPushState.apply(this, [data, unused, url]);
      self.handleSpaNavigation();
    };

    window.history.replaceState = function (data: any, unused: string, url?: string | URL | null) {
      originalReplaceState.apply(this, [data, unused, url]);
      self.handleSpaNavigation();
    };

    window.addEventListener('popstate', () => {
      self.handleSpaNavigation();
    });

    window.addEventListener('hashchange', () => {
      self.handleSpaNavigation();
    });
  }

  private handleSpaNavigation(): void {
    const newPath = this.getPathName();
    if (newPath !== this.currentPath) {
      if (this.config.debug) {
        console.log(`[RUM SDK] SPA Navigation: ${this.currentPath} -> ${newPath}`);
      }
      this.trackPageView(false); // Track page view for previous page duration
      this.currentPath = newPath;
      this.pageStartTime = performance.now();
      this.trackPageView(true); // Track new page view
    }
  }

  private trackPageView(isStart: boolean): void {
    if (isStart) {
      const pageView: Omit<PageViewEvent, 'timestamp' | 'path'> = {
        type: 'pageview',
        title: typeof document !== 'undefined' ? document.title : '',
        referrer: typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct'
      };
      const fullEvent: RumEvent = {
        ...pageView,
        timestamp: new Date().toISOString(),
        path: this.currentPath
      } as RumEvent;
      this.queue.enqueue(fullEvent);
    } else {
      // Record duration spent on previous page
      const durationMs = Math.round(performance.now() - this.pageStartTime);
      const pageView: Omit<PageViewEvent, 'timestamp' | 'path'> = {
        type: 'pageview',
        title: typeof document !== 'undefined' ? document.title : '',
        referrer: typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct',
        durationMs
      };
      const fullEvent: RumEvent = {
        ...pageView,
        timestamp: new Date().toISOString(),
        path: this.currentPath
      } as RumEvent;
      this.queue.enqueue(fullEvent);
    }
  }

  /**
   * Log a custom event manually
   */
  public logEvent(name: string, metadata?: Record<string, any>): void {
    const customEvent: RumEvent = {
      type: 'event',
      eventType: 'custom',
      elementTag: name,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      timestamp: new Date().toISOString(),
      path: this.currentPath
    };
    this.queue.enqueue(customEvent);
  }

  /**
   * Force flush the telemetry queue
   */
  public flush(): void {
    this.queue.flush();
  }
}
