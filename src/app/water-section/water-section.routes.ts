import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'water',
    pathMatch: 'full',
  },
  {
    path: 'water',
    loadComponent: () => import('./water/water.page'),
  },
];

export default routes;
