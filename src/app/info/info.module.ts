import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import {AboutComponent} from './about/about.component';
import {ContactComponent} from './contact/contact.component';
import {CreditsComponent} from './credits/credits.component';
import {LicencesComponent} from './licences/licences.component';
import {PrivacyComponent} from './privacy/privacy.component';
import {TermsComponent} from './terms/terms.component';
import {ThanksComponent} from './thanks/thanks.component';
import {KeysPipe} from '../../pipes/keys';
import {UIHelper} from '../../services/uiHelper';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { File } from '@ionic-native/file/ngx';
import {UIFileHelper} from '../../services/uiFileHelper';
import {SharedModule} from '../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: 'contact',
        component: ContactComponent,
        pathMatch:'full'
      },
      {
        path: 'about',
        component: AboutComponent,
        pathMatch:'full'
      },
      {
        path: 'credits',
        component: CreditsComponent,
        pathMatch:'full'
      },
      {
        path: 'licences',
        component: LicencesComponent,
        pathMatch:'full'
      },
      {
        path: 'privacy',
        component: PrivacyComponent,
        pathMatch:'full'
      },
      {
        path: 'terms',
        component: TermsComponent,
        pathMatch:'full'
      }
      ,
      {
        path: 'thanks',
        component: ThanksComponent,
        pathMatch:'full'
      }
    ]),
      SharedModule
  ],
  declarations: [AboutComponent,
    ContactComponent,
    CreditsComponent,
    LicencesComponent,
    PrivacyComponent,
    TermsComponent,
    ThanksComponent,
  ],
  providers: []

})
export class InfoModule {}
