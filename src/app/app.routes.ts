import { inject } from '@angular/core';
import { Route, Routes } from '@angular/router';

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

/** Sends a former path to its page in the profile tab (`home.routes.ts`). */
function movedToProfile(from: string, to = from): Route {
  return { path: from, redirectTo: `/home/profile/${to}`, pathMatch: 'full' };
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
    path: 'helper',
    loadComponent: () => import('./helper/helper.page'),
    loadChildren: () => import('./helper/helper.routes'),
  },
  {
    path: 'baristamode',
    loadComponent: () => import('./baristamode/baristamode.page'),
    loadChildren: () => import('./baristamode/baristamode.routes'),
  },
  // Former pages of the side menu, kept for existing links.
  movedToProfile('statistic'),
  movedToProfile('settings'),
  movedToProfile('info'),
  movedToProfile('info/:page'),
  movedToProfile('brew-parameter'),
  movedToProfile('brew-parameter/:page'),
  movedToProfile('bean-parameter'),
  movedToProfile('bean-parameter/:page'),
  movedToProfile('water-section', 'water'),
  movedToProfile('water-section/water', 'water'),
  movedToProfile('graph-section', 'graph'),
  movedToProfile('graph-section/graph', 'graph'),
]);
