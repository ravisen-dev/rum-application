import { Routes } from '@angular/router';
import { AppsComponent } from './pages/apps/apps.component';
import { DashboardComponent } from './layout/dashboard/dashboard.component';
import { OverviewComponent } from './pages/overview/overview.component';
import { VitalsComponent } from './pages/vitals/vitals.component';
import { PagesComponent } from './pages/pages/pages.component';
import { NetworkComponent } from './pages/network/network.component';
import { ErrorsComponent } from './pages/errors/errors.component';
import { SessionsComponent } from './pages/sessions/sessions.component';

export const routes: Routes = [
  { path: '', redirectTo: '/apps', pathMatch: 'full' },
  { path: 'apps', component: AppsComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: OverviewComponent },
      { path: 'vitals', component: VitalsComponent },
      { path: 'pages', component: PagesComponent },
      { path: 'network', component: NetworkComponent },
      { path: 'errors', component: ErrorsComponent },
      { path: 'sessions', component: SessionsComponent }
    ]
  },
  { path: '**', redirectTo: '/apps' }
];
