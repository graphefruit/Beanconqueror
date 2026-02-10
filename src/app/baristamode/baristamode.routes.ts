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
];

export default routes;
