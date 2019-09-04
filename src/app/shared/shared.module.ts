import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';

import {FormatDatePipe} from '../../pipes/formatDate';
import {KeysPipe} from '../../pipes/keys';
import {CommonModule} from '@angular/common';
import {IonicModule} from '@ionic/angular';
import {AsyncImageComponent} from '../../components/async-image/async-image.component';
import {SearchPipe} from '../../pipes/search';
import {RemoveEmptyNumberDirective} from '../../directive/remove-empty-number.directive';
import {PreventCharacterDirective} from '../../directive/prevent-character.directive';
import {BrewAddComponent} from '../brew/brew-add/brew-add.component';
import {BrewPage} from '../brew/brew.page';
import {BrewDetailComponent} from '../brew/brew-detail/brew-detail.component';
import {BrewEditComponent} from '../brew/brew-edit/brew-edit.component';
import {BrewPhotoViewComponent} from '../brew/brew-photo-view/brew-photo-view.component';
import {BrewPopoverComponent} from '../brew/brew-popover/brew-popover.component';
import {BrewTableComponent} from '../brew/brew-table/brew-table.component';
import {BrewTextComponent} from '../brew/brew-text/brew-text.component';
import {TimerComponent} from '../../components/timer/timer.component';
import {FormsModule} from '@angular/forms';
import {MillPage} from '../mill/mill.page';
import {MillEditComponent} from '../mill/mill-edit/mill-edit.component';
import {MillAddComponent} from '../mill/mill-add/mill-add.component';
import {PreparationPage} from '../preparation/preparation.page';
import {PreparationAddComponent} from '../preparation/preparation-add/preparation-add.component';
import {PreparationEditComponent} from '../preparation/preparation-edit/preparation-edit.component';


@NgModule({
  declarations: [PreparationPage, PreparationAddComponent, PreparationEditComponent, MillPage, MillEditComponent, MillAddComponent, BrewAddComponent, FormatDatePipe, KeysPipe, AsyncImageComponent, SearchPipe, RemoveEmptyNumberDirective, PreventCharacterDirective, BrewPage, BrewDetailComponent, BrewEditComponent, BrewPhotoViewComponent, BrewPopoverComponent, BrewTableComponent, BrewTextComponent, TimerComponent],
  entryComponents: [PreparationPage, PreparationAddComponent, PreparationEditComponent, MillPage, MillEditComponent, MillAddComponent, BrewAddComponent, BrewPage, BrewDetailComponent, BrewEditComponent, BrewPhotoViewComponent, BrewPopoverComponent, BrewTableComponent, BrewTextComponent, TimerComponent],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
  ],
  providers: [
    RemoveEmptyNumberDirective, PreventCharacterDirective, FormatDatePipe, KeysPipe
  ],

  exports: [PreparationPage, PreparationAddComponent, PreparationEditComponent, MillPage, MillEditComponent, MillAddComponent, BrewAddComponent, FormatDatePipe,
    KeysPipe, AsyncImageComponent, SearchPipe, RemoveEmptyNumberDirective, PreventCharacterDirective, BrewPage, BrewDetailComponent, BrewEditComponent, BrewPhotoViewComponent, BrewPopoverComponent, BrewTableComponent, BrewTextComponent, TimerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule {
}
