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
    path: 'profile',
    loadComponent: () => import('../profile/profile.page'),
  },
  // Preparation methods and grinders live in the profile tab's stack, so the
  // profile tab stays selected and back returns to the profile page.
  {
    path: 'profile/preparations',
    loadComponent: () => import('../preparation/preparation.page'),
  },
  {
    path: 'profile/mills',
    loadComponent: () => import('../mill/mill.page'),
  },
  // Former tab routes, kept for existing links.
  {
    path: 'preparations',
    redirectTo: 'profile/preparations',
    pathMatch: 'full',
  },
  {
    path: 'mills',
    redirectTo: 'profile/mills',
    pathMatch: 'full',
  },
];

export default routes;
