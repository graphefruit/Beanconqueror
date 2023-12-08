import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { WaterSectionPageRoutingModule } from './water-section-routing.module';

import { WaterSectionPage } from './water-section.page';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    WaterSectionPageRoutingModule,
    SharedModule,
  ],
  declarations: [],
})
export class WaterSectionPageModule {}
