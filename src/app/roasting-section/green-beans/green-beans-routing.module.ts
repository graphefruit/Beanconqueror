import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { GreenBeansPage } from './green-beans.page';

const routes: Routes = [
  {
    path: '',
    component: GreenBeansPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GreenBeansPageRoutingModule {}
