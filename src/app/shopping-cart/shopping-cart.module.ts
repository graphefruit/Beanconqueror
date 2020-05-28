import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';

import {IonicModule} from '@ionic/angular';

import {ShoppingCartPage} from './shopping-cart.page';
import {SharedModule} from '../shared/shared.module';
import {ShoppingCartRoutingModule} from './shopping-cart-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ShoppingCartRoutingModule,
    SharedModule
  ],
  declarations: [ShoppingCartPage]
})
export class ShoppingCartModule {
}
