import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/roasting-section/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./green-beans/green-beans.page'),
  },
  {
    path: 'roasting-machine',
    loadComponent: () => import('./roasting-machine/roasting-machine.page'),
  },
];

export default routes;
