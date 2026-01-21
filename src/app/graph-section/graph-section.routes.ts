import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'graph',
    pathMatch: 'full',
  },
  {
    path: 'graph',
    loadComponent: () => import('./graph/graph.page'),
  },
];

export default routes;
