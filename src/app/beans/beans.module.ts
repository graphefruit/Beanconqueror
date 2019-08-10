import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { BeansPage } from './beans.page';
import {KeysPipe} from '../../pipes/keys';
import {FormatDatePipe} from '../../pipes/formatDate';
import {BeansAddComponent} from './beans-add/beans-add.component';
import {RemoveEmptyNumberDirective} from '../../directive/remove-empty-number.directive';
import {PreventCharacterDirective} from '../../directive/prevent-character.directive';
import {UIImage} from '../../services/uiImage';
import {Camera} from '@ionic-native/camera/ngx';
import {ImagePicker} from '@ionic-native/image-picker/ngx';
import {AndroidPermissions} from '@ionic-native/android-permissions/ngx';
import {BeansEditComponent} from './beans-edit/beans-edit.component';
import {AppModule} from '../app.module';
import {SharedModule} from '../shared/shared.module';
import {BrewPageModule} from '../brew/brew.module';

const routes: Routes = [
  {
    path: '',
    component: BeansPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    SharedModule,
  ],
  declarations: [BeansPage, BeansAddComponent, BeansEditComponent],
  providers:[],
  entryComponents:[BeansAddComponent,BeansEditComponent],
})
export class BeansPageModule {}
