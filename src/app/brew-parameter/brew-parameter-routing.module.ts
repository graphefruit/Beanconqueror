import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { BrewParameterPage } from './brew-parameter.page';
import { ManageParameterComponent } from './manage-parameter/manage-parameter.component';
import { SortParameterComponent } from './sort-parameter/sort-parameter.component';
import { DefaultParameterComponent } from './default-parameter/default-parameter.component';
import { ListViewParameterComponent } from './list-view-parameter/list-view-parameter.component';
import { RepeatParameterComponent } from './repeat-parameter/repeat-parameter.component';

const routes: Routes = [
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

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BrewParameterPageRoutingModule {}
