import { NgModule } from '@angular/core';
import { KeysPipe } from './keys';
import { EnumToArrayPipe } from './enumToArray';
import { FormatDatePipe } from './formatDate';
import { ToFixedPipe } from './toFixed';

@NgModule({
  declarations: [EnumToArrayPipe, FormatDatePipe, KeysPipe, ToFixedPipe],
  exports: [EnumToArrayPipe, FormatDatePipe, KeysPipe, ToFixedPipe],
})
export class PipesModule {}
