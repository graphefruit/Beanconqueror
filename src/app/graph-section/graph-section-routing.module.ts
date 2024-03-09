import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { GraphSectionPage } from './graph-section.page';

const routes: Routes = [
  {
    path: '',
    component: GraphSectionPage,
    children: [
      {
        path: '',
        redirectTo: '/graph-section/graph',
        pathMatch: 'full',
      },
      {
        path: 'graph',
        loadChildren: () =>
          import('./graph/graph.module').then((m) => m.GraphPageModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GraphSectionPageRoutingModule {}
