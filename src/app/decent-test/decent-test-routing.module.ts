import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DecentTestPage } from './decent-test.page';

const routes: Routes = [
  {
    path: '',
    component: DecentTestPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DecentTestPageRoutingModule {}
