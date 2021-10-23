import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';

import {IonicModule} from '@ionic/angular';
import {RouterModule, Routes} from '@angular/router';
import {SharedModule} from '../shared/shared.module';
import {HelperBrewRatioComponent} from './helper-brew-ratio/helper-brew-ratio.component';
import {HelperWaterHardnessComponent} from './helper-water-hardness/helper-water-hardness.component';


import {HelperPage} from './helper.page';

const routes: Routes = [
  {
    path: '',
    component: HelperPage,
    children: [{
      path: '',
      redirectTo: '/helper/brew-ratio',
      pathMatch: 'full',
    },
    {
      path: 'brew-ratio',
      component: HelperBrewRatioComponent
    },
    {
      path: 'water-hardness',
      component: HelperWaterHardnessComponent
    }
   ]
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
