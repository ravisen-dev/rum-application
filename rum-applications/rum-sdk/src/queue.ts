import { RumEvent, RumConfig, SessionContext, TelemetryBatch } from './types';

export class TelemetryQueue {
  private queue: RumEvent[] = [];
  private config: RumConfig;
  private sessionContext: SessionContext;
  private intervalId: any = null;

  constructor(config: RumConfig, sessionContext: SessionContext) {
    this.config = config;
    this.sessionContext = sessionContext;
    this.startTimer();
    this.setupUnloadHandler();
  }

  public enqueue(event: RumEvent): void {
    // Check sampling rate
    const sampleRate = this.config.sampleRate ?? 1.0;
    if (Math.random() > sampleRate) {
      return;
    }

    if (this.config.debug) {
      console.log('[RUM SDK] Enqueued Event:', event);
    }

    this.queue.push(event);

    const maxQueueSize = this.config.maxQueueSize ?? 20;
    if (this.queue.length >= maxQueueSize) {
      this.flush();
    }
  }

  public flush(): void {
    if (this.queue.length === 0) return;

    const eventsToFlush = [...this.queue];
    this.queue = [];

    const batch: TelemetryBatch = {
      applicationId: this.config.applicationId,
      session: this.sessionContext,
      events: eventsToFlush
    };

    const payload = JSON.stringify(batch);

    if (this.config.debug) {
      console.log('[RUM SDK] Flushing batch of size:', eventsToFlush.length);
    }

    // Try sendBeacon first if browser supports it, otherwise use fetch with keepalive
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      const success = navigator.sendBeacon(this.config.endpoint, blob);
      if (success) return;
    }

    // Fallback standard fetch with keepalive: true
    fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload,
      keepalive: true
    }).catch(err => {
      if (this.config.debug) {
        console.error('[RUM SDK] Failed to send telemetry batch:', err);
      }
    });
  }

  private startTimer(): void {
    const intervalMs = this.config.batchIntervalMs ?? 5000;
    this.intervalId = setInterval(() => this.flush(), intervalMs);
  }

  private setupUnloadHandler(): void {
    // Standard visibilitychange event handles dynamic mobile tabs and desktop unloads cleanly
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
    // Fallback standard beforeunload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  public destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.flush();
  }
}
