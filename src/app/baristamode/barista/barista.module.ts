import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BaristaPageRoutingModule } from './barista-routing.module';

import { BaristaPage } from './barista.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedModule,
    BaristaPageRoutingModule,
  ],
  declarations: [],
})
export class BaristaPageModule {}
