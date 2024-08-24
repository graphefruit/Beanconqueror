import { NgModule } from '@angular/core';
import { KeysPipe } from './keys';
import { EnumToArrayPipe } from './enumToArray';
import { FormatDatePipe } from './formatDate';

@NgModule({
  declarations: [EnumToArrayPipe, FormatDatePipe, KeysPipe],
  exports: [EnumToArrayPipe, FormatDatePipe, KeysPipe],
})
export class PipesModule {}
