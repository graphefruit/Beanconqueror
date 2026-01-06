import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('../dashboard/dashboard.page'),
  },
  {
    path: 'brews',
    loadComponent: () => import('../brew/brew.page'),
  },
  {
    path: 'beans',
    loadComponent: () => import('../beans/beans.page'),
  },
  {
    path: 'preparations',
    loadComponent: () => import('../preparation/preparation.page'),
  },
  {
    path: 'mills',
    loadComponent: () => import('../mill/mill.page'),
  },
];

export default routes;
