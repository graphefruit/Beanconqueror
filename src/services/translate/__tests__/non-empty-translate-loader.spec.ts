import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { TranslationObject } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  dropEmptyTranslations,
  NonEmptyTranslateLoader,
} from '../non-empty-translate-loader';

describe('dropEmptyTranslations', () => {
  const cases: {
    name: string;
    loaded: TranslationObject;
    kept: TranslationObject;
  }[] = [
    {
      name: 'drops an empty text',
      loaded: { VIEW: '', CLOSE: 'Chiudi' },
      kept: { CLOSE: 'Chiudi' },
    },
    {
      name: 'drops an empty text inside a group',
      loaded: { SCALE: { LOG: '', TARE: 'Tara' } },
      kept: { SCALE: { TARE: 'Tara' } },
    },
    {
      name: 'keeps a group whose texts are all empty as an empty group',
      loaded: { A11Y: { CLOSE: '' } },
      kept: { A11Y: {} },
    },
    {
      name: 'keeps a text of blanks',
      loaded: { SEPARATOR: ' ' },
      kept: { SEPARATOR: ' ' },
    },
    {
      name: 'keeps lists with their empty lines',
      loaded: { DESCRIPTION: ['Prima', '', 'Dopo'] },
      kept: { DESCRIPTION: ['Prima', '', 'Dopo'] },
    },
    {
      name: 'keeps null',
      loaded: { NOTHING: null },
      kept: { NOTHING: null },
    },
  ];

  for (const { name, loaded, kept } of cases) {
    it(name, () => {
      expect<unknown>(dropEmptyTranslations(loaded)).toEqual(kept);
    });
  }

  it('leaves the loaded texts unchanged', () => {
    const loaded: TranslationObject = { VIEW: '', SCALE: { LOG: '' } };

    dropEmptyTranslations(loaded);

    expect<unknown>(loaded).toEqual({ VIEW: '', SCALE: { LOG: '' } });
  });
});

describe('NonEmptyTranslateLoader', () => {
  let http: HttpTestingController;
  let loader: NonEmptyTranslateLoader;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NonEmptyTranslateLoader,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    loader = TestBed.inject(NonEmptyTranslateLoader);
  });

  afterEach(() => http.verify());

  it('loads the language file of the app without its empty texts', async () => {
    const loaded = firstValueFrom(loader.getTranslation('it'));

    http
      .expectOne('./assets/i18n/it.json')
      .flush({ VIEW: '', CLOSE: 'Chiudi' });

    expect<unknown>(await loaded).toEqual({ CLOSE: 'Chiudi' });
  });

  it('passes a failed load on', async () => {
    const loaded = firstValueFrom(loader.getTranslation('xx'));

    http
      .expectOne('./assets/i18n/xx.json')
      .flush('', { status: 404, statusText: 'Not Found' });

    await expectAsync(loaded).toBeRejected();
  });
});
