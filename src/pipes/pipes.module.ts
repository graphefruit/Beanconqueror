import { NgModule } from '@angular/core';
import { KeysPipe } from './keys';
import { EnumToArrayPipe } from './enumToArray';
import { FormatDatePipe } from './formatDate';
import { ToFixedPipe } from './toFixed';
import { BrewFieldVisiblePipe } from './brew/brewFieldVisible';
import { BrewFieldOrder } from './brew/brewFieldOrder';
import { BeanFieldVisiblePipe } from './bean/beanFieldVisible';
import { BrewFunction } from './brew/brewFunction';

@NgModule({
  declarations: [
    EnumToArrayPipe,
    FormatDatePipe,
    KeysPipe,
    ToFixedPipe,
    BrewFieldVisiblePipe,
    BrewFieldOrder,
    BeanFieldVisiblePipe,
    BrewFunction,
  ],
  exports: [
    EnumToArrayPipe,
    FormatDatePipe,
    KeysPipe,
    ToFixedPipe,
    BrewFieldVisiblePipe,
    BrewFieldOrder,
    BeanFieldVisiblePipe,
    BrewFunction,
  ],
})
export class PipesModule {}
