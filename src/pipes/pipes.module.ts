import { NgModule } from '@angular/core';
import { KeysPipe } from './keys';
import { EnumToArrayPipe } from './enumToArray';
import { FormatDatePipe } from './formatDate';
import { ToFixedPipe } from './toFixed';
import { BrewFieldVisiblePipe } from './brew/brewFieldVisible';
import { BrewFieldOrder } from './brew/brewFieldOrder';
import { BeanFieldVisiblePipe } from './bean/beanFieldVisible';

@NgModule({
  declarations: [
    EnumToArrayPipe,
    FormatDatePipe,
    KeysPipe,
    ToFixedPipe,
    BrewFieldVisiblePipe,
    BrewFieldOrder,
    BeanFieldVisiblePipe,
  ],
  exports: [
    EnumToArrayPipe,
    FormatDatePipe,
    KeysPipe,
    ToFixedPipe,
    BrewFieldVisiblePipe,
    BrewFieldOrder,
    BeanFieldVisiblePipe,
  ],
})
export class PipesModule {}
