import { Routes } from '@angular/router';
import { HelperBrewRatioComponent } from './helper-brew-ratio/helper-brew-ratio.component';
import { HelperWaterHardnessComponent } from './helper-water-hardness/helper-water-hardness.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'brew-ratio',
    pathMatch: 'full',
  },
  {
    path: 'brew-ratio',
    component: HelperBrewRatioComponent,
  },
  {
    path: 'water-hardness',
    component: HelperWaterHardnessComponent,
  },
];

export default routes;
