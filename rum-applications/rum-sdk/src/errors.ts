import { ErrorEvent } from './types';

export class ErrorTracker {
  private onErrCollected: (err: Omit<ErrorEvent, 'timestamp' | 'path'>) => void;

  constructor(onErrCollected: (err: Omit<ErrorEvent, 'timestamp' | 'path'>) => void) {
    this.onErrCollected = onErrCollected;
    this.initErrorListeners();
  }

  private initErrorListeners(): void {
    if (typeof window === 'undefined') return;

    // 1. Unhandled runtime errors
    window.addEventListener('error', (event: ErrorEventInit & any) => {
      // Don't track empty error events
      if (!event.error && !event.message) return;

      const message = event.error?.message || event.message || 'Unknown runtime error';
      const stackTrace = event.error?.stack || '';
      const fileName = event.filename || '';
      const lineNumber = event.lineno || 0;
      const columnNumber = event.colno || 0;

      this.onErrCollected({
        type: 'error',
        message,
        stackTrace,
        fileName,
        lineNumber,
        columnNumber
      });
    });

    // 2. Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      let message = 'Unhandled Promise Rejection';
      let stackTrace = '';
      let fileName = '';
      let lineNumber = 0;
      let columnNumber = 0;

      if (reason) {
        if (reason instanceof Error) {
          message = reason.message;
          stackTrace = reason.stack || '';
          // Try parsing basic info from stack if available
        } else if (typeof reason === 'string') {
          message = reason;
        } else {
          try {
            message = JSON.stringify(reason);
          } catch (e) {}
        }
      }

      this.onErrCollected({
        type: 'error',
        message: `Promise Rejection: ${message}`,
        stackTrace,
        fileName,
        lineNumber,
        columnNumber
      });
    });
  }
}
