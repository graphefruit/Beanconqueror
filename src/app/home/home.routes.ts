import { Routes } from '@angular/router';

const statistics = () => import('../statistic/statistic.page');
const brewParameters = () => import('../brew-parameter/brew-parameter.routes');
const beanParameters = () => import('../bean-parameter/bean-parameter.routes');

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
  // A page lives in the stack of the tab it is opened from, so the tab bar
  // stays, that tab stays selected and back returns to where it was opened.
  {
    path: 'dashboard/statistic',
    loadComponent: statistics,
  },
  {
    path: 'brews/brew-parameter',
    loadChildren: brewParameters,
  },
  {
    path: 'beans/bean-parameter',
    loadChildren: beanParameters,
  },
  {
    path: 'profile/preparations',
    loadComponent: () => import('../preparation/preparation.page'),
  },
  {
    path: 'profile/mills',
    loadComponent: () => import('../mill/mill.page'),
  },
  {
    path: 'profile/sections',
    loadComponent: () => import('../profile/sections/sections.page'),
  },
  {
    path: 'profile/statistic',
    loadComponent: statistics,
  },
  {
    path: 'profile/brew-parameter',
    loadChildren: brewParameters,
  },
  {
    path: 'profile/bean-parameter',
    loadChildren: beanParameters,
  },
  {
    path: 'profile/settings',
    loadComponent: () => import('../settings/settings.page'),
  },
  {
    path: 'profile/info',
    loadChildren: () => import('../info/info.routes'),
  },
  {
    path: 'profile/water',
    loadComponent: () => import('../water-section/water/water.page'),
  },
  {
    path: 'profile/graph',
    loadComponent: () => import('../graph-section/graph/graph.page'),
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
