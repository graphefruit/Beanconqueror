import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { WaterPage } from './water.page';

const routes: Routes = [
  {
    path: '',
    component: WaterPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WaterPageRoutingModule {}
