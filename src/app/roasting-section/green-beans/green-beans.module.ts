import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { GreenBeansPageRoutingModule } from './green-beans-routing.module';

import {SharedModule} from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GreenBeansPageRoutingModule,
    SharedModule
  ],
  declarations: []
})
export class GreenBeansPageModule {}
