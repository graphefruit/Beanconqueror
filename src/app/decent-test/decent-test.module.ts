import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DecentTestPageRoutingModule } from './decent-test-routing.module';

import { DecentTestPage } from './decent-test.page';
import {SharedModule} from '../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DecentTestPageRoutingModule,
    SharedModule,
  ],
  declarations: []
})
export class DecentTestPageModule {}
