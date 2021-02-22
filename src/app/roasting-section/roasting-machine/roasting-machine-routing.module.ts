import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RoastingMachinePage } from './roasting-machine.page';

const routes: Routes = [
  {
    path: '',
    component: RoastingMachinePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RoastingMachinePageRoutingModule {}
