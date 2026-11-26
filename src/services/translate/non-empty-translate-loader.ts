import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';

/**
 * Lokalise writes a text that is not translated yet as an empty string. ngx-translate shows an
 * empty string as it is and falls back to English only for a missing key, so empty texts are
 * dropped. Lists (e.g. the lines of the release notes) are kept as they are.
 */
export function dropEmptyTranslations(
  translations: TranslationObject,
): TranslationObject {
  const result: TranslationObject = {};
  for (const [key, value] of Object.entries(translations)) {
    if (value === '') {
      continue;
    }
    result[key] =
      value !== null && typeof value === 'object' && !Array.isArray(value)
        ? dropEmptyTranslations(value)
        : value;
  }
  return result;
}

/** Loads ./assets/i18n/<lang>.json without its empty texts. */
@Injectable()
export class NonEmptyTranslateLoader implements TranslateLoader {
  private readonly http = inject(HttpClient);

  public getTranslation(lang: string): Observable<TranslationObject> {
    return this.http
      .get<TranslationObject>(`./assets/i18n/${lang}.json`)
      .pipe(map(dropEmptyTranslations));
  }
}
