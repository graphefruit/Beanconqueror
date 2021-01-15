import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {SettingsPage} from './settings.page';
import {ReportingLoggingParameterComponent} from './reporting-logging-parameter/reporting-logging-parameter.component';

const routes: Routes = [
  {
    path: '',
    component: SettingsPage,
  },
  {
    path: 'reporting',
    component: ReportingLoggingParameterComponent
  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsPageRoutingModule {
}
