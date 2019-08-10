import {CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { BrewPage } from './brew.page';
import {BrewAddComponent} from './brew-add/brew-add.component';
import {BrewDetailComponent} from './brew-detail/brew-detail.component';
import {BrewEditComponent} from './brew-edit/brew-edit.component';
import {BrewPhotoViewComponent} from './brew-photo-view/brew-photo-view.component';
import {BrewPopoverComponent} from './brew-popover/brew-popover.component';
import {BrewTableComponent} from './brew-table/brew-table.component';
import {BrewTextComponent} from './brew-text/brew-text.component';
import {TimerComponent} from '../../components/timer/timer.component';
import {AsyncImageComponent} from '../../components/async-image/async-image.component';
import {SharedModule} from '../shared/shared.module';

const routes: Routes = [
  {
    path: '',
    component: BrewPage
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
  declarations: [BrewPage,BrewAddComponent,BrewDetailComponent,BrewEditComponent,BrewPhotoViewComponent,BrewPopoverComponent,BrewTableComponent,BrewTextComponent,TimerComponent],
  entryComponents:[BrewAddComponent,BrewDetailComponent,BrewEditComponent,BrewPhotoViewComponent,BrewPopoverComponent,BrewTableComponent,BrewTextComponent],
  providers: [],
  exports: [
  ]
})
export class BrewPageModule {}
