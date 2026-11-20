import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { SearchbarNameDirective } from '../searchbar-name.directive';

/**
 * Ionic's components do not load in unit tests, so the directive runs on a
 * stand-in element here, with the field and clear button ion-searchbar
 * renders into the light DOM. e2e/a11y-texts.spec.ts covers the real one.
 */
@Component({
  imports: [SearchbarNameDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<test-searchbar [searchName]="name()">
    <input class="searchbar-input" aria-label="search text" />
    <button class="searchbar-clear-button" aria-label="reset"></button>
  </test-searchbar>`,
})
class HostComponent {
  public readonly name = signal('Bohnen durchsuchen');
}

describe('SearchbarNameDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
    });
    TestBed.overrideDirective(SearchbarNameDirective, {
      set: { selector: 'test-searchbar[searchName]' },
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', { A11Y: { CLEAR_SEARCH: 'Suche leeren' } });
    translate.setTranslation('en', { A11Y: { CLEAR_SEARCH: 'Clear search' } });
    translate.use('de');
    fixture = TestBed.createComponent(HostComponent);
    await settle();
  });

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function nameOf(selector: string): string | null {
    return (fixture.nativeElement as HTMLElement)
      .querySelector(selector)
      .getAttribute('aria-label');
  }

  it('names the field after what it searches and the clear button in the app language', () => {
    expect(nameOf('input')).toBe('Bohnen durchsuchen');
    expect(nameOf('button')).toBe('Suche leeren');
  });

  it('follows the name and the app language', async () => {
    fixture.componentInstance.name.set('Search beans');
    TestBed.inject(TranslateService).use('en');
    await settle();

    expect(nameOf('input')).toBe('Search beans');
    expect(nameOf('button')).toBe('Clear search');
  });
});
