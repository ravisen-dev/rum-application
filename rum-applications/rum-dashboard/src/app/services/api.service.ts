import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5000/api';

  getApplications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/applications`);
  }

  createApplication(name: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/applications`, { name });
  }

  getOverview(appId: string, rangeDays: number = 7): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dashboards/overview?appId=${appId}&rangeDays=${rangeDays}`);
  }

  getWebVitals(appId: string, rangeDays: number = 7): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/dashboards/web-vitals?appId=${appId}&rangeDays=${rangeDays}`);
  }

  getPages(appId: string, rangeDays: number = 7): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/dashboards/pages?appId=${appId}&rangeDays=${rangeDays}`);
  }

  getNetwork(appId: string, rangeDays: number = 7): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/dashboards/network?appId=${appId}&rangeDays=${rangeDays}`);
  }

  getErrors(appId: string, rangeDays: number = 7): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/dashboards/errors?appId=${appId}&rangeDays=${rangeDays}`);
  }

  getSessions(appId: string, rangeDays: number = 7): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/dashboards/sessions?appId=${appId}&rangeDays=${rangeDays}`);
  }

  getSessionDetails(sessionId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dashboards/sessions/${sessionId}`);
  }
}
