import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';

import {FormatDatePipe} from '../../pipes/formatDate';
import {KeysPipe} from '../../pipes/keys';
import {CommonModule} from '@angular/common';
import {IonicModule} from '@ionic/angular';
import {AsyncImageComponent} from '../../components/async-image/async-image.component';
import {SearchPipe} from '../../pipes/search';


@NgModule({
  declarations: [FormatDatePipe, KeysPipe, AsyncImageComponent, SearchPipe],
  entryComponents: [],
  imports: [
    CommonModule,
    IonicModule
  ],
  providers: [
  ],
  exports: [FormatDatePipe, KeysPipe, AsyncImageComponent, SearchPipe],
  schemas:[CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule { }
