import { DOCUMENT, inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

const RTL_LANGUAGES = new Set(['ar', 'he']);

/**
 * Keeps the `lang` and `dir` attributes of the document in sync with the app language,
 * so screen readers pick the right voice, browsers pick the right CJK glyphs and
 * right-to-left languages are laid out correctly.
 */
@Injectable({
  providedIn: 'root',
})
export class DocumentLanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly translate = inject(TranslateService);

  public start(): void {
    this.translate.onLangChange.subscribe(({ lang }) => this.apply(lang));
  }

  private apply(appLanguage: string): void {
    // App language codes use an underscore (zh_TW); HTML expects BCP 47 (zh-TW).
    const lang = appLanguage.replace('_', '-');
    const root = this.document.documentElement;
    root.lang = lang;
    root.dir = RTL_LANGUAGES.has(lang.split('-')[0]) ? 'rtl' : 'ltr';
  }
}
