import { Routes } from '@angular/router';
import { AboutComponent } from './about/about.component';
import { ContactComponent } from './contact/contact.component';
import { CookieComponent } from './cookie/cookie.component';
import { CreditsComponent } from './credits/credits.component';
import { ImpressumComponent } from './impressum/impressum.component';
import { InfoComponent } from './info.component';
import { LicencesComponent } from './licences/licences.component';
import { LogComponent } from './log/log.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { TermsComponent } from './terms/terms.component';
import { ThanksComponent } from './thanks/thanks.component';

export const routes: Routes = [
  { path: '', component: InfoComponent },
  { path: 'contact', component: ContactComponent },
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
  },
  {
    path: 'thanks',
    component: ThanksComponent,
  },
  {
    path: 'logs',
    component: LogComponent,
  },
  {
    path: 'impressum',
    component: ImpressumComponent,
  },
  {
    path: 'cookie',
    component: CookieComponent,
  },
];

export default routes;
