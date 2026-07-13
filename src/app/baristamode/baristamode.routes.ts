import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'barista',
    pathMatch: 'full',
  },
  {
    path: 'barista',
    loadComponent: () => import('./barista/barista.page'),
  },
  {
    path: 'brews',
    loadComponent: () => import('./baristamode-brews/baristamode-brews.page'),
  },
  {
    path: 'statistics',
    loadComponent: () =>
      import('./baristamode-statistics/baristamode-statistics.page'),
  },
];

export default routes;
