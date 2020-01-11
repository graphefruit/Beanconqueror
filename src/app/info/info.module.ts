import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {RouterModule, Routes} from '@angular/router';
import {AboutComponent} from './about/about.component';
import {ContactComponent} from './contact/contact.component';
import {CreditsComponent} from './credits/credits.component';
import {LicencesComponent} from './licences/licences.component';
import {PrivacyComponent} from './privacy/privacy.component';
import {TermsComponent} from './terms/terms.component';
import {ThanksComponent} from './thanks/thanks.component';
import {SharedModule} from '../shared/shared.module';
import {LogComponent} from './log/log.component';

const routes: Routes = [
  {path: 'contact', component: ContactComponent},
  {
    path: 'about',
    component: AboutComponent,
  },
  {
    path: 'credits',
    component: CreditsComponent,
  },
  {
    path: 'licences',
    component: LicencesComponent,
  },
  {
    path: 'privacy',
    component: PrivacyComponent,
  },
  {
    path: 'terms',
    component: TermsComponent,
  }
  ,
  {
    path: 'thanks',
    component: ThanksComponent,
  },
  {
    path: 'logs',
    component: LogComponent
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
  declarations: [
  ],
  providers: []

})
export class InfoModule {}
