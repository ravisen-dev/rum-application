import { SessionContext } from './types';

export class SessionManager {
  private sessionGuid: string;
  private browser: string;
  private os: string;
  private deviceType: string;
  private resolution: string;
  private referrer: string;

  constructor() {
    this.sessionGuid = this.getOrCreateSessionGuid();
    this.browser = this.detectBrowser();
    this.os = this.detectOS();
    this.deviceType = this.detectDeviceType();
    this.resolution = `${window.screen.width}x${window.screen.height}`;
    this.referrer = document.referrer || 'direct';
  }

  private getOrCreateSessionGuid(): string {
    const KEY = 'rum_session_guid';
    let guid = sessionStorage.getItem(KEY);
    if (!guid) {
      guid = this.generateUUID();
      sessionStorage.setItem(KEY, guid);
    }
    return guid;
  }

  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback UUID generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private detectBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome') && !ua.includes('Chromium') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Trident') || ua.includes('MSIE')) return 'IE';
    return 'Unknown Browser';
  }

  private detectOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) return 'macOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) return 'iOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown OS';
  }

  private detectDeviceType(): string {
    const ua = navigator.userAgent;
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'Mobile';
    if (/Tablet|iPad/i.test(ua)) return 'Tablet';
    return 'Desktop';
  }

  public getContext(): SessionContext {
    return {
      sessionGuid: this.sessionGuid,
      browser: this.browser,
      os: this.os,
      deviceType: this.deviceType,
      resolution: this.resolution,
      referrer: this.referrer
    };
  }
}
