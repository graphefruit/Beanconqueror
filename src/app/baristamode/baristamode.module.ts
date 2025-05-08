import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BaristamodePageRoutingModule } from './baristamode-routing.module';

import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BaristamodePageRoutingModule,
    SharedModule,
  ],
  declarations: [],
})
export class BaristamodePageModule {}
