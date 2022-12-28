import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BeanParameterPageRoutingModule } from './bean-parameter-routing.module';

import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BeanParameterPageRoutingModule,
    SharedModule,
  ],
  declarations: [],
})
export class BeanParameterPageModule {}
