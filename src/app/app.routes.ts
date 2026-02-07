import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { UIHelper } from '../services/uiHelper';
import HomePage from './home/home.page';
import { routes as HomeRoutes } from './home/home.routes';

function appReadyResolver(): Promise<void> {
  const uiHelper = inject(UIHelper);
  return uiHelper.isBeanconqurorAppReady();
}

function withAppReadyResolver(routes: Routes): Routes {
  return routes.map((route) => ({
    ...route,
    resolve: {
      ...route.resolve,
      appReady: appReadyResolver,
    },
  }));
}

export const routes: Routes = withAppReadyResolver([
  {
    path: '',
    redirectTo: '/home/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'home',
    // Eagerly load the /home section as we need it immediately anyway
    component: HomePage,
    children: HomeRoutes,
  },
  {
    path: 'roasting-section',
    loadComponent: () => import('./roasting-section/roasting-section.page'),
    loadChildren: () => import('./roasting-section/roasting-section.routes'),
  },
  {
    path: 'water-section',
    loadComponent: () => import('./water-section/water-section.page'),
    loadChildren: () => import('./water-section/water-section.routes'),
  },
  {
    path: 'info',
    loadChildren: () => import('./info/info.routes'),
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.page'),
    pathMatch: 'full',
  },
  {
    path: 'statistic',
    loadComponent: () => import('./statistic/statistic.page'),
    pathMatch: 'full',
  },
  {
    path: 'helper',
    loadComponent: () => import('./helper/helper.page'),
    loadChildren: () => import('./helper/helper.routes'),
  },
  {
    path: 'brew-parameter',
    loadChildren: () => import('./brew-parameter/brew-parameter.routes'),
  },
  {
    path: 'bean-parameter',
    loadChildren: () => import('./bean-parameter/bean-parameter.routes'),
  },
  {
    path: 'graph-section',
    loadComponent: () => import('./graph-section/graph-section.page'),
    loadChildren: () => import('./graph-section/graph-section.routes'),
  },
  {
    path: 'baristamode',
    loadComponent: () => import('./baristamode/baristamode.page'),
    loadChildren: () => import('./baristamode/baristamode.routes'),
  },
]);
