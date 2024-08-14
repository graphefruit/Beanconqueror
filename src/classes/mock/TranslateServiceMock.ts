import { NEVER, Observable } from 'rxjs';
import { EventEmitter } from '@angular/core';
import {
  DefaultLangChangeEvent,
  LangChangeEvent,
  TranslateService,
  TranslationChangeEvent,
} from '@ngx-translate/core';

export const TranslateServiceMock = {
  instant: (_key: string | Array<string>, _interpolateParams?: any) => {
    return 'hello';
  },
  get(_key: string | Array<string>, _interpolateParams?: any): Observable<any> {
    return NEVER;
  },
  get onTranslationChange(): EventEmitter<TranslationChangeEvent> {
    return new EventEmitter();
  },
  get onLangChange(): EventEmitter<LangChangeEvent> {
    return new EventEmitter<LangChangeEvent>();
  },
  get onDefaultLangChange(): EventEmitter<DefaultLangChangeEvent> {
    return new EventEmitter();
  },
} as TranslateService;
