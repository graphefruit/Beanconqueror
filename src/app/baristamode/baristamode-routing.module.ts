import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BaristamodePage } from './baristamode.page';

const routes: Routes = [
  {
    path: '',
    component: BaristamodePage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BaristamodePageRoutingModule {}
