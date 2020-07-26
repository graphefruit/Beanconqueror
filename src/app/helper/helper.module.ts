import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';

import {IonicModule} from '@ionic/angular';
import {RouterModule, Routes} from '@angular/router';
import {SharedModule} from '../shared/shared.module';
import {HelperBrewRatioComponent} from './helper-brew-ratio/helper-brew-ratio.component';
import {HelperWaterHardnessComponent} from './helper-water-hardness/helper-water-hardness.component';

const routes: Routes = [
  {
    path: 'brew-ratio',
    component: HelperBrewRatioComponent
  },
  {
    path: 'water-hardness',
    component: HelperWaterHardnessComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    SharedModule
  ],
  declarations: [],
  providers: []
})
export class HelperPageModule {
}
