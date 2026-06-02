import { WebVitalEvent } from './types';

export class WebVitalsCollector {
  private onMetricCollected: (metric: Omit<WebVitalEvent, 'timestamp' | 'path'>) => void;
  private clsValue = 0;

  constructor(onMetricCollected: (metric: Omit<WebVitalEvent, 'timestamp' | 'path'>) => void) {
    this.onMetricCollected = onMetricCollected;
    this.initObservers();
  }

  private initObservers(): void {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      return;
    }

    // 1. TTFB (Time to First Byte)
    try {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries && navEntries.length > 0) {
        this.reportTTFB(navEntries[0]);
      } else {
        window.addEventListener('load', () => {
          const navEntriesLoad = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
          if (navEntriesLoad && navEntriesLoad.length > 0) {
            this.reportTTFB(navEntriesLoad[0]);
          }
        });
      }
    } catch (e) {}

    // 2. FCP (First Contentful Paint)
    try {
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        for (const entry of entries) {
          if (entry.name === 'first-contentful-paint') {
            this.reportFCP(entry.startTime);
            fcpObserver.disconnect();
          }
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch (e) {}

    // 3. LCP (Largest Contentful Paint)
    try {
      let lcpValue = 0;
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        for (const entry of entries) {
          lcpValue = entry.startTime;
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // Report LCP on visibility hidden (most accurate, per Web Vitals spec)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && lcpValue > 0) {
          this.reportLCP(lcpValue);
          lcpValue = 0; // prevent double reporting
        }
      });
    } catch (e) {}

    // 4. FID (First Input Delay)
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries() as PerformanceEventTiming[];
        for (const entry of entries) {
          const delay = entry.processingStart - entry.startTime;
          this.reportFID(delay);
          fidObserver.disconnect();
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {}

    // 5. CLS (Cumulative Layout Shift)
    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries() as any[];
        for (const entry of entries) {
          if (!entry.hadRecentInput) {
            this.clsValue += entry.value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Report Cumulative CLS when tab hides
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.reportCLS(this.clsValue);
        }
      });
    } catch (e) {}

    // 6. INP (Interaction to Next Paint)
    try {
      let maxInpValue = 0;
      const inpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries() as PerformanceEventTiming[];
        for (const entry of entries) {
          const entryAny = entry as any;
          if (entryAny.interactionId) {
            const duration = entryAny.duration;
            if (duration > maxInpValue) {
              maxInpValue = duration;
            }
          }
        }
      });
      inpObserver.observe({ type: 'event', buffered: true });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && maxInpValue > 0) {
          this.reportINP(maxInpValue);
          maxInpValue = 0;
        }
      });
    } catch (e) {}
  }

  private reportTTFB(entry: PerformanceNavigationTiming): void {
    const value = entry.responseStart; // TTFB
    const rating = value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
    this.onMetricCollected({ type: 'webvital', metricName: 'TTFB', value, rating });
  }

  private reportFCP(value: number): void {
    const rating = value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
    this.onMetricCollected({ type: 'webvital', metricName: 'FCP', value, rating });
  }

  private reportLCP(value: number): void {
    const rating = value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    this.onMetricCollected({ type: 'webvital', metricName: 'LCP', value, rating });
  }

  private reportFID(value: number): void {
    const rating = value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
    this.onMetricCollected({ type: 'webvital', metricName: 'FID', value, rating });
  }

  private reportCLS(value: number): void {
    const rating = value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    this.onMetricCollected({ type: 'webvital', metricName: 'CLS', value, rating });
  }

  private reportINP(value: number): void {
    const rating = value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
    this.onMetricCollected({ type: 'webvital', metricName: 'INP', value, rating });
  }
}
