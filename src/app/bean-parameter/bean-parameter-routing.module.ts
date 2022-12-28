import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BeanParameterPage } from './bean-parameter.page';
import { BeanListViewParameterComponent } from './bean-list-view-parameter/bean-list-view-parameter.component';
import { BeanManageParameterComponent } from './bean-manage-parameter/bean-manage-parameter.component';

const routes: Routes = [
  {
    path: '',
    component: BeanParameterPage,
  },
  {
    path: 'manage',
    component: BeanManageParameterComponent,
  },
  {
    path: 'listview',
    component: BeanListViewParameterComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BeanParameterPageRoutingModule {}
