import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ScaleTestPage } from './scale-test.page';

const routes: Routes = [
  {
    path: '',
    component: ScaleTestPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ScaleTestPageRoutingModule {}
