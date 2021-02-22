import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RoastingMachinePageRoutingModule } from './roasting-machine-routing.module';

import { RoastingMachinePage } from './roasting-machine.page';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RoastingMachinePageRoutingModule,
    SharedModule
  ],
  declarations: [RoastingMachinePage]
})
export class RoastingMachinePageModule {}
