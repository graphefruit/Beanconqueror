import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ScaleTestPageRoutingModule } from './scale-test-routing.module';

import { ScaleTestPage } from './scale-test.page';
import {SharedModule} from '../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ScaleTestPageRoutingModule,
    SharedModule,
  ],
  declarations: []
})
export class ScaleTestPageModule {}
