import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { PreparationPage } from './preparation.page';
import {PreparationAddComponent} from './preparation-add/preparation-add.component';
import {PreparationEditComponent} from './preparation-edit/preparation-edit.component';
import {BeansAddComponent} from '../beans/beans-add/beans-add.component';
import {BeansEditComponent} from '../beans/beans-edit/beans-edit.component';

const routes: Routes = [
  {
    path: '',
    component: PreparationPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [PreparationPage,PreparationAddComponent,PreparationEditComponent],
  entryComponents:[PreparationAddComponent,PreparationEditComponent],
})
export class PreparationPageModule {}
