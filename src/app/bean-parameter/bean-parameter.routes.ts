import { Routes } from '@angular/router';

import { BeanListViewParameterComponent } from './bean-list-view-parameter/bean-list-view-parameter.component';
import { BeanManageParameterComponent } from './bean-manage-parameter/bean-manage-parameter.component';
import { BeanParameterPage } from './bean-parameter.page';

export const routes: Routes = [
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

export default routes;
