import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { WaterSectionPage } from './water-section.page';


const routes: Routes = [
  {
    path: '',
    component: WaterSectionPage,
    children: [
      {
        path: '',
        redirectTo: '/water-section/water',
        pathMatch: 'full',
      },
      {
        path: 'water',
        loadChildren: () => import('./water/water.module').then(m => m.WaterPageModule),
      }
    ]
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WaterSectionPageRoutingModule {}
