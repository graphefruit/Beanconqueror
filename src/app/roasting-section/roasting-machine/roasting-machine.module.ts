import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RoastingMachinePageRoutingModule } from './roasting-machine-routing.module';

import {SharedModule} from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RoastingMachinePageRoutingModule,
    SharedModule
  ],
  declarations: []
})
export class RoastingMachinePageModule {}
