import {CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA} from '@angular/core';

import {FormatDatePipe} from '../../pipes/formatDate';
import {KeysPipe} from '../../pipes/keys';
import {BrewAddComponent} from '../brew/brew-add/brew-add.component';
import {CommonModule} from '@angular/common';
import {IonicModule} from '@ionic/angular';
import {AsyncImageComponent} from '../../components/async-image/async-image.component';


@NgModule({
  declarations: [FormatDatePipe,KeysPipe,AsyncImageComponent],
  entryComponents: [],
  imports: [
    CommonModule,
    IonicModule
  ],
  providers: [
  ],
  exports:[FormatDatePipe,KeysPipe,AsyncImageComponent],
  schemas:[CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule { }
