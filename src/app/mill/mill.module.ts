import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { MillPage } from './mill.page';
import {MillEditComponent} from './mill-edit/mill-edit.component';
import {MillAddComponent} from './mill-add/mill-add.component';

const routes: Routes = [
  {
    path: '',
    component: MillPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [MillPage,MillEditComponent,MillAddComponent],
  entryComponents: [MillEditComponent,MillAddComponent]
})
export class MillPageModule {}
