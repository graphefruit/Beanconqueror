import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { HomePage } from './home.page';
import {BrewAddComponent} from '../brew/brew-add/brew-add.component';
import {SharedModule} from '../shared/shared.module';
import {BrewPageModule} from '../brew/brew.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: HomePage
      }
    ]),
      SharedModule
  ],
  entryComponents:[],
  declarations: [HomePage]
})
export class HomePageModule {}
