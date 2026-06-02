import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface TodoSession {
  sessionGuid: string;
  browser: string;
  os: string;
  deviceType: string;
  resolution: string;
  referrer: string;
}

@Injectable({
  providedIn: 'root'
})
export class RumApiService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5000/api';
  private localStorageKey = 'rum-sdk-todos-app';
  private sessionKey = 'rum-sdk-todos-session';

  async getApplications(): Promise<any[]> {
    return lastValueFrom(this.http.get<any[]>(`${this.baseUrl}/applications`));
  }

  async createApplication(name: string): Promise<any> {
    return lastValueFrom(this.http.post<any>(`${this.baseUrl}/applications`, { name }));
  }

  async ingest(batch: any): Promise<any> {
    return lastValueFrom(this.http.post<any>(`${this.baseUrl}/telemetry/ingest`, batch));
  }

  private getSessionGuid(): string {
    const stored = localStorage.getItem(this.sessionKey);
    if (stored) {
      return stored;
    }
    const newGuid = this.generateGuid();
    localStorage.setItem(this.sessionKey, newGuid);
    return newGuid;
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private detectBrowser(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edg') || userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private detectOS(): string {
    const platform = navigator.platform;
    if (/Win/.test(platform)) return 'Windows';
    if (/Mac/.test(platform)) return 'macOS';
    if (/Linux/.test(platform)) return 'Linux';
    if (/Android/.test(platform)) return 'Android';
    if (/iPhone|iPad|iPod/.test(platform)) return 'iOS';
    return 'Unknown';
  }

  private detectDeviceType(): string {
    return /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
  }

  getSessionMetadata(): TodoSession {
    return {
      sessionGuid: this.getSessionGuid(),
      browser: this.detectBrowser(),
      os: this.detectOS(),
      deviceType: this.detectDeviceType(),
      resolution: `${window.screen.width}x${window.screen.height}`,
      referrer: document.referrer || window.location.href
    };
  }

  async sendTelemetry(appId: string, event: any): Promise<void> {
    const payload = {
      applicationId: appId,
      session: this.getSessionMetadata(),
      events: [
        {
          type: event.type,
          timestamp: new Date().toISOString(),
          path: event.path || '/',
          eventType: event.eventType,
          elementId: event.elementId,
          elementTag: event.elementTag,
          elementClass: event.elementClass,
          elementPath: event.elementPath,
          metadata: event.metadata,
          message: event.message,
          title: event.title,
          durationMs: event.durationMs,
          url: event.url,
          method: event.method,
          statusCode: event.statusCode,
          metricName: event.metricName,
          value: event.value,
          rating: event.rating
        }
      ]
    };

    await this.ingest(payload);
  }
}
