import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {SettingsPage} from './settings.page';
import {SplunkLoggingParameterComponent} from './splunk-logging-parameter/splunk-logging-parameter.component';

const routes: Routes = [
  {
    path: '',
    component: SettingsPage,
  },
  {
    path: 'splunk',
    component: SplunkLoggingParameterComponent
  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsPageRoutingModule {
}
