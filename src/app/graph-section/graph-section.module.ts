import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { GraphSectionPageRoutingModule } from './graph-section-routing.module';

import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GraphSectionPageRoutingModule,
    SharedModule,
  ],
  declarations: [],
})
export class GraphSectionPageModule {}
