import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RoastingSectionPage } from './roasting-section.page';
import {RouteResolver} from '../app-routing-resolver';

const routes: Routes = [
  {
    path: '',
    component: RoastingSectionPage,
    children: [
      {
        path: '',
        redirectTo: '/roasting-section/dashboard',
        pathMatch: 'full',
        resolve: {
          resolver: RouteResolver
        },
      },
      {
        path: 'dashboard',
        loadChildren: './green-beans/green-beans.module#GreenBeansPageModule',

      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RoastingSectionPageRoutingModule {}
