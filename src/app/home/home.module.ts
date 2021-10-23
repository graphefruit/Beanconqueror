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
            loadChildren: () => import('../dashboard/dashboard.module').then(m => m.DashboardPageModule),
          },
          {
            path: 'brews',
            loadChildren: () => import('../brew/brew.module').then(m => m.BrewPageModule)
          },
          {
            path: 'beans',
            loadChildren: () => import('../beans/beans.module').then(m => m.BeansPageModule)
          }, {
            path: 'preparations',
            loadChildren: () => import('../preparation/preparation.module').then(m => m.PreparationPageModule)
          },
          {
            path: 'mills',
            loadChildren: () => import('../mill/mill.module').then(m => m.MillPageModule)
          }
        ]
      }
    ]),
    SharedModule,
  ],
  entryComponents:[],
  declarations: []
})
export class HomePageModule {}
