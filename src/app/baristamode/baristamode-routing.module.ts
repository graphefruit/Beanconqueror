import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BaristamodePage } from './baristamode.page';
import { WaterSectionPage } from '../water-section/water-section.page';

const routes: Routes = [
  {
    path: '',
    component: BaristamodePage,
    children: [
      {
        path: '',
        redirectTo: '/baristamode/barista',
        pathMatch: 'full',
      },
      {
        path: 'barista',
        loadChildren: () =>
          import('./barista/barista.module').then((m) => m.BaristaPageModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BaristamodePageRoutingModule {}
