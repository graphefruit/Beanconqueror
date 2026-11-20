import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { IonicLabelsService } from '../ionic-labels.service';

const IONIC_GRIP_NAME =
  'Activate to adjust the size of the dialog overlaying the screen';

/**
 * Modals are simulated in a document of their own: an element with a shadow
 * root that holds the grip as Ionic renders it.
 */
describe('IonicLabelsService', () => {
  let doc: Document;
  let language: string;
  let langChange: Subject<LangChangeEvent>;

  const texts: Record<string, Record<string, string>> = {
    de: { 'A11Y.RESIZE_DIALOG': 'Dialoggröße ändern' },
    en: { 'A11Y.RESIZE_DIALOG': 'Resize dialog' },
  };

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument('');
    language = 'de';
    langChange = new Subject();
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: doc },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string) => texts[language][key] ?? key,
            onLangChange: langChange,
          },
        },
      ],
    });
    TestBed.inject(IonicLabelsService).start();
  });

  function openModal(handleTabIndex = 0): HTMLButtonElement {
    const modal = doc.createElement('ion-modal');
    const handle = doc.createElement('button');
    handle.className = 'modal-handle';
    handle.tabIndex = handleTabIndex;
    handle.setAttribute('aria-label', IONIC_GRIP_NAME);
    modal.attachShadow({ mode: 'open' }).append(handle);
    doc.body.append(modal);
    modal.dispatchEvent(
      new CustomEvent('ionModalWillPresent', { bubbles: true }),
    );
    return handle;
  }

  it('names the grip of a sheet modal in the app language', () => {
    const handle = openModal();

    expect(handle.getAttribute('aria-label')).toBe('Dialoggröße ändern');
    expect(handle.hasAttribute('aria-hidden')).toBeFalse();
  });

  it('names the grips of open modals again when the language changes', () => {
    const handle = openModal();

    language = 'en';
    langChange.next({ lang: 'en', translations: {} });

    expect(handle.getAttribute('aria-label')).toBe('Resize dialog');
  });

  it('hides a grip without function from screen readers', () => {
    const handle = openModal(-1);

    expect(handle.getAttribute('aria-hidden')).toBe('true');
  });

  it('stops listening when the app is destroyed', () => {
    TestBed.resetTestingModule();

    const handle = openModal();

    expect(handle.getAttribute('aria-label')).toBe(IONIC_GRIP_NAME);
  });
});
