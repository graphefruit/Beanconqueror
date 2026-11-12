import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { DocumentLanguageService } from '../document-language.service';

describe('DocumentLanguageService', () => {
  let langChange: Subject<LangChangeEvent>;
  let root: HTMLElement;

  beforeEach(() => {
    langChange = new Subject<LangChangeEvent>();
    root = document.implementation.createHTMLDocument('').documentElement;
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: { onLangChange: langChange } },
        { provide: DOCUMENT, useValue: { documentElement: root } },
      ],
    });
    TestBed.inject(DocumentLanguageService).start();
  });

  function switchTo(lang: string) {
    langChange.next({ lang, translations: {} });
  }

  it('announces the chosen app language to the document', () => {
    switchTo('de');
    expect(root.lang).toBe('de');
    expect(root.dir).toBe('ltr');
  });

  it('uses a valid language tag for traditional Chinese', () => {
    switchTo('zh_TW');
    expect(root.lang).toBe('zh-TW');
  });

  it('lays out Arabic and Hebrew right to left and switches back', () => {
    switchTo('ar');
    expect(root.dir).toBe('rtl');
    switchTo('he');
    expect(root.dir).toBe('rtl');
    switchTo('en');
    expect(root.dir).toBe('ltr');
  });
});
