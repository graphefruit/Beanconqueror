import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BaristaPage } from './barista.page';

const routes: Routes = [
  {
    path: '',
    component: BaristaPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BaristaPageRoutingModule {}
