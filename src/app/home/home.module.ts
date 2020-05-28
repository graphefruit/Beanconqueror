import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {RouterModule} from '@angular/router';

import {HomePage} from './home.page';
import {SharedModule} from '../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: HomePage,
        children: [
          {
            path: 'dashboard',
            loadChildren: '../dashboard/dashboard.module#DashboardPageModule',
          },
          {
            path: 'brews',
            loadChildren: '../brew/brew.module#BrewPageModule'
          },
          {
            path: 'beans',
            loadChildren: '../beans/beans.module#BeansPageModule'
          }, {
            path: 'preparations',
            loadChildren: '../preparation/preparation.module#PreparationPageModule'
          },
          {
            path: 'mills',
            loadChildren: '../mill/mill.module#MillPageModule'
          },

        ]
      }
    ]),
    SharedModule,
  ],
  entryComponents:[],
  declarations: []
})
export class HomePageModule {}
