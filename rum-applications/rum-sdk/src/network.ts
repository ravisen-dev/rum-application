import { NetworkEvent } from './types';

export class NetworkTracker {
  private onNetworkCollected: (net: Omit<NetworkEvent, 'timestamp' | 'path'>) => void;
  private ingestionEndpoint: string;

  constructor(
    ingestionEndpoint: string,
    onNetworkCollected: (net: Omit<NetworkEvent, 'timestamp' | 'path'>) => void
  ) {
    this.ingestionEndpoint = ingestionEndpoint;
    this.onNetworkCollected = onNetworkCollected;
    this.patchFetch();
    this.patchXHR();
  }

  private isIngestionRequest(url: string): boolean {
    return url.includes(this.ingestionEndpoint);
  }

  private patchFetch(): void {
    if (typeof window === 'undefined' || !window.fetch) return;

    const originalFetch = window.fetch;
    const tracker = this;

    window.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const start = performance.now();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      const method = init?.method || (typeof input === 'object' && 'method' in input ? (input as any).method : 'GET');

      // Ignore telemetry calls to avoid loop
      if (tracker.isIngestionRequest(url)) {
        return originalFetch.apply(this, [input, init]);
      }

      try {
        const response = await originalFetch.apply(this, [input, init]);
        const duration = Math.round(performance.now() - start);

        tracker.onNetworkCollected({
          type: 'network',
          url,
          method,
          statusCode: response.status,
          durationMs: duration
        });

        return response;
      } catch (err) {
        const duration = Math.round(performance.now() - start);
        tracker.onNetworkCollected({
          type: 'network',
          url,
          method,
          statusCode: 0, // Network failure / CORS issue
          durationMs: duration
        });
        throw err;
      }
    };
  }

  private patchXHR(): void {
    if (typeof window === 'undefined' || !window.XMLHttpRequest) return;

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const tracker = this;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      ...args: any[]
    ) {
      const xhr = this as any;
      xhr._rumData = {
        method,
        url: typeof url === 'string' ? url : url.toString(),
        start: 0
      };
      return originalOpen.apply(this, [method, url, ...args] as any);
    };

    XMLHttpRequest.prototype.send = function (body?: any) {
      const xhr = this as any;
      if (xhr._rumData) {
        xhr._rumData.start = performance.now();

        // Ignore telemetry calls
        if (tracker.isIngestionRequest(xhr._rumData.url)) {
          return originalSend.apply(xhr, [body]);
        }

        xhr.addEventListener('loadend', () => {
          const duration = Math.round(performance.now() - xhr._rumData.start);
          tracker.onNetworkCollected({
            type: 'network',
            url: xhr._rumData.url,
            method: xhr._rumData.method,
            statusCode: xhr.status,
            durationMs: duration
          });
        });
      }
      return originalSend.apply(xhr, [body]);
    };
  }
}
