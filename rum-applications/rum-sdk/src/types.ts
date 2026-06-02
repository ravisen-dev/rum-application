export type EventType = 'pageview' | 'webvital' | 'network' | 'error' | 'event';

export interface BaseEvent {
  type: EventType;
  timestamp: string;
  path: string;
}

export interface PageViewEvent extends BaseEvent {
  type: 'pageview';
  title: string;
  referrer: string;
  durationMs?: number;
}

export interface WebVitalEvent extends BaseEvent {
  type: 'webvital';
  metricName: 'FCP' | 'LCP' | 'FID' | 'CLS' | 'INP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface NetworkEvent extends BaseEvent {
  type: 'network';
  url: string;
  method: string;
  statusCode: number;
  durationMs: number;
}

export interface ErrorEvent extends BaseEvent {
  type: 'error';
  message: string;
  stackTrace: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export interface UserActionEvent extends BaseEvent {
  type: 'event';
  eventType: string; // e.g. click
  elementId?: string;
  elementClass?: string;
  elementTag?: string;
  elementPath?: string;
  metadata?: string; // stringified JSON
}

export type RumEvent = PageViewEvent | WebVitalEvent | NetworkEvent | ErrorEvent | UserActionEvent;

export interface SessionContext {
  sessionGuid: string;
  browser: string;
  os: string;
  deviceType: string;
  resolution: string;
  referrer: string;
}

export interface TelemetryBatch {
  applicationId: string;
  session: SessionContext;
  events: RumEvent[];
}

export interface RumConfig {
  endpoint: string;
  applicationId: string;
  sampleRate?: number; // 0.0 to 1.0 (default 1.0)
  debug?: boolean;
  batchIntervalMs?: number; // default 5000
  maxQueueSize?: number; // default 20
}
