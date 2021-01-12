import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RoastingSectionPageRoutingModule } from './roasting-section-routing.module';


import {SharedModule} from '../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RoastingSectionPageRoutingModule,
    SharedModule,
  ],
  entryComponents:[],
  declarations: []
})
export class RoastingSectionPageModule {}
