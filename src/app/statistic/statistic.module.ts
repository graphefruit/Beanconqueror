import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, SharedModule],
  declarations: [],
})
export class StatisticPageModule {}
