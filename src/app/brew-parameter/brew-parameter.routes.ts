import { Routes } from '@angular/router';

import { BrewParameterPage } from './brew-parameter.page';
import { DefaultParameterComponent } from './default-parameter/default-parameter.component';
import { ListViewParameterComponent } from './list-view-parameter/list-view-parameter.component';
import { ManageParameterComponent } from './manage-parameter/manage-parameter.component';
import { RepeatParameterComponent } from './repeat-parameter/repeat-parameter.component';
import { SortParameterComponent } from './sort-parameter/sort-parameter.component';

export const routes: Routes = [
  {
    path: '',
    component: BrewParameterPage,
  },
  {
    path: 'manage',
    component: ManageParameterComponent,
  },
  {
    path: 'sort',
    component: SortParameterComponent,
  },
  {
    path: 'default',
    component: DefaultParameterComponent,
  },
  {
    path: 'listview',
    component: ListViewParameterComponent,
  },
  {
    path: 'repeat',
    component: RepeatParameterComponent,
  },
];

export default routes;
