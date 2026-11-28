import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { IonInput } from '@ionic/angular';
import { defineCustomElement as defineInput } from '@ionic/core/components/ion-input.js';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  AnnouncementPoliteness,
  LIVE_REGION,
  LiveRegion,
} from '../../../services/a11y/live-region';
import {
  matchSuggestions,
  splitAtMatch,
  SUGGESTION_LIMIT,
  SuggestionListComponent,
} from '../suggestion-list.component';

describe('matchSuggestions', () => {
  it('should keep the values containing the query, whatever the case, in their order', () => {
    expect(
      matchSuggestions(['Rösterei Süd', 'Bonanza', 'Rösterei Nord'], 'rÖs'),
    ).toEqual(['Rösterei Süd', 'Rösterei Nord']);
  });

  it(`should return at most ${SUGGESTION_LIMIT} values`, () => {
    const pool = Array.from({ length: 20 }, (_, i) => `Roaster ${i}`);

    expect(matchSuggestions(pool, 'roaster')).toEqual(pool.slice(0, 8));
    expect(matchSuggestions(pool, 'roaster', 3)).toEqual(pool.slice(0, 3));
  });

  it('should suggest nothing for an empty query', () => {
    expect(matchSuggestions(['Kenya'], '')).toEqual([]);
  });
});

describe('splitAtMatch', () => {
  it('should split a suggestion around the first match, whatever the case', () => {
    expect(splitAtMatch('Rösterei Nord', 'NORD')).toEqual({
      before: 'Rösterei ',
      match: 'Nord',
      after: '',
    });
  });

  it('should mark nothing without a match', () => {
    expect(splitAtMatch('Kenya', 'eth')).toEqual({
      before: 'Kenya',
      match: '',
      after: '',
    });
  });

  it('should mark nothing where lower case changes the length of the text', () => {
    expect(splitAtMatch('İzmir', 'zm').match).toBe('');
  });
});

/** Keeps what screen readers would hear. */
class FakeLiveRegion implements LiveRegion {
  public readonly messages: string[] = [];

  public announce(message: string, _politeness: AnnouncementPoliteness): void {
    this.messages.push(message);
  }
}

@Component({
  template: `
    <suggestion-list (picked)="picked.push($event)" [candidates]="candidates">
      <ion-input />
    </suggestion-list>
  `,
  imports: [SuggestionListComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
class HostComponent {
  public values = ['Rösterei Nord', 'Rösterei Süd', 'Kaffeerösterei', 'Nord'];
  public readonly candidates = jasmine
    .createSpy('candidates')
    .and.callFake(() => this.values);
  public readonly picked: string[] = [];
  public readonly keysAround: string[] = [];
}

describe('SuggestionListComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let liveRegion: FakeLiveRegion;

  beforeEach(() => {
    liveRegion = new FakeLiveRegion();
    TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [{ provide: LIVE_REGION, useValue: liveRegion }],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      SUGGESTIONS: 'Suggestions',
      SUGGESTIONS_COUNT_ONE: '1 suggestion',
      SUGGESTIONS_COUNT_OTHER: '{{count}} suggestions',
    });
    translate.use('en');
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    // What the dialog around the field would get.
    root().addEventListener('keydown', (event) =>
      host.keysAround.push(event.key),
    );
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function field(): HTMLElement {
    return root().querySelector('ion-input');
  }

  function focus(): void {
    field().dispatchEvent(new CustomEvent('ionFocus', { bubbles: true }));
  }

  /** Types into the field the way ion-input reports it. */
  function type(value: string): void {
    Object.assign(field(), { value });
    field().dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
    fixture.detectChanges();
  }

  function press(key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    });
    field().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  }

  function listbox(): HTMLElement | null {
    return root().querySelector('[role="listbox"]');
  }

  function options(): HTMLElement[] {
    return Array.from(root().querySelectorAll<HTMLElement>('[role="option"]'));
  }

  function selected(): string[] {
    return options()
      .filter((option) => option.getAttribute('aria-selected') === 'true')
      .map((option) => option.textContent.trim());
  }

  it('should list the matches as options of a named listbox, the match in bold', () => {
    focus();
    type('nord');

    expect(listbox().getAttribute('aria-label')).toBe('Suggestions');
    expect(options().map((option) => option.textContent.trim())).toEqual([
      'Rösterei Nord',
      'Nord',
    ]);
    expect(
      options().map((option) => option.querySelector('strong').textContent),
    ).toEqual(['Nord', 'Nord']);
  });

  it('should ignore spaces before the typed text, not those after it', () => {
    focus();
    type(' nord');

    expect(options().map((option) => option.textContent.trim())).toEqual([
      'Rösterei Nord',
      'Nord',
    ]);

    type(' rösterei ');

    expect(options().map((option) => option.textContent.trim())).toEqual([
      'Rösterei Nord',
      'Rösterei Süd',
    ]);
  });

  it(`should show at most ${SUGGESTION_LIMIT} suggestions`, () => {
    host.values = Array.from({ length: 12 }, (_, i) => `Roaster ${i}`);
    focus();
    type('roaster');

    expect(options().length).toBe(8);
  });

  it('should read the stored values once when the field gets focus, not on every key', () => {
    focus();
    type('r');
    type('rö');
    type('rös');

    expect(host.candidates).toHaveBeenCalledTimes(1);
    expect(options().length).toBe(3);
  });

  it('should suggest nothing until the field has focus', () => {
    type('nord');

    expect(listbox()).toBeNull();
    expect(host.candidates).not.toHaveBeenCalled();
  });

  it('should move through the options with the arrow keys and wrap around', () => {
    focus();
    type('rös');

    expect(press('ArrowDown').defaultPrevented).toBeTrue();
    expect(selected()).toEqual(['Rösterei Nord']);
    press('ArrowDown');
    press('ArrowDown');
    expect(selected()).toEqual(['Kaffeerösterei']);
    press('ArrowDown');
    expect(selected()).toEqual(['Rösterei Nord']);
    press('ArrowUp');
    expect(selected()).toEqual(['Kaffeerösterei']);
  });

  it('should start at the last option with the up arrow', () => {
    focus();
    type('rös');
    press('ArrowUp');

    expect(selected()).toEqual(['Kaffeerösterei']);
  });

  it('should pick the active option with Enter and close the list', () => {
    focus();
    type('rös');
    press('ArrowDown');
    press('ArrowDown');

    expect(press('Enter').defaultPrevented).toBeTrue();
    expect(host.picked).toEqual(['Rösterei Süd']);
    expect(listbox()).toBeNull();
  });

  it('should leave Enter alone while no option is active', () => {
    focus();
    type('rös');

    expect(press('Enter').defaultPrevented).toBeFalse();
    expect(host.picked).toEqual([]);
    expect(listbox()).not.toBeNull();
  });

  it('should close the list with Escape without closing what the field is in', () => {
    focus();
    type('rös');

    expect(press('Escape').defaultPrevented).toBeTrue();
    expect(listbox()).toBeNull();
    expect(host.keysAround).not.toContain('Escape');
  });

  it('should let Escape through while the list is closed', () => {
    focus();
    press('Escape');

    expect(host.keysAround).toEqual(['Escape']);
  });

  it('should pick a tapped option, also on its bold part', () => {
    focus();
    type('nord');
    options()[1].querySelector('strong').click();
    fixture.detectChanges();

    expect(host.picked).toEqual(['Nord']);
    expect(listbox()).toBeNull();
  });

  it('should close the list shortly after the field is left', fakeAsync(() => {
    focus();
    type('rös');
    field().dispatchEvent(new CustomEvent('ionBlur', { bubbles: true }));
    tick(100);
    fixture.detectChanges();
    expect(listbox()).not.toBeNull();

    tick(50);
    fixture.detectChanges();
    expect(listbox()).toBeNull();
  }));

  it('should announce the number of suggestions when it changes', fakeAsync(() => {
    focus();
    type('rös');
    type('röst');
    expect(liveRegion.messages).toEqual(['3 suggestions']);

    type('nord');
    tick(3000);
    expect(liveRegion.messages).toEqual(['3 suggestions', '2 suggestions']);

    type('');
    type('süd');
    expect(liveRegion.messages).toEqual([
      '3 suggestions',
      '2 suggestions',
      '1 suggestion',
    ]);
  }));
});

interface Vessel {
  name: string;
  weight: number;
}

@Component({
  template: `
    <suggestion-list
      (picked)="picked.push($event)"
      [candidates]="candidates"
      [label]="label"
    >
      <ion-input class="name" />
      <ion-input class="weight" />
    </suggestion-list>
  `,
  imports: [SuggestionListComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
class PairHostComponent {
  public readonly candidates = (): Vessel[] => [
    { name: 'Carafe', weight: 300 },
    { name: 'Carafe', weight: 350 },
    { name: 'Carafe', weight: 300 },
  ];
  public readonly label = (vessel: Vessel): string =>
    `${vessel.name} ${vessel.weight}`;
  public readonly picked: Vessel[] = [];
}

describe('SuggestionListComponent with a name and a weight field', () => {
  let fixture: ComponentFixture<PairHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PairHostComponent, TranslateModule.forRoot()],
      providers: [{ provide: LIVE_REGION, useValue: new FakeLiveRegion() }],
    });
    fixture = TestBed.createComponent(PairHostComponent);
    fixture.detectChanges();
  });

  function input(name: 'name' | 'weight'): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector(`.${name}`);
  }

  function send(name: 'name' | 'weight', type: string, value = ''): void {
    Object.assign(input(name), { value });
    input(name).dispatchEvent(new CustomEvent(type, { bubbles: true }));
    fixture.detectChanges();
  }

  function options(): string[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '[role="option"]',
      ),
      (option) => option.textContent.trim(),
    );
  }

  it('suggests each candidate once by its label and picks the whole candidate', () => {
    send('name', 'ionFocus');
    send('name', 'ionInput', 'car');

    expect(options()).toEqual(['Carafe 300', 'Carafe 350']);

    (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLElement>('[role="option"]')[1]
      .click();

    expect(fixture.componentInstance.picked).toEqual([
      { name: 'Carafe', weight: 350 },
    ]);
  });

  it('suggests nothing for what is typed into the other field', () => {
    send('weight', 'ionFocus');
    send('weight', 'ionInput', '3');

    expect(options()).toEqual([]);
  });

  it('closes the list when the focus moves on to the other field', fakeAsync(() => {
    send('name', 'ionFocus');
    send('name', 'ionInput', 'car');
    send('name', 'ionBlur');
    send('weight', 'ionFocus');
    tick(150);
    fixture.detectChanges();

    expect(options()).toEqual([]);
  }));

  it('leaves the keys of the other field alone', () => {
    send('name', 'ionFocus');
    send('name', 'ionInput', 'car');
    const key = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    input('weight').dispatchEvent(key);

    expect(key.defaultPrevented).toBeFalse();
  });
});

@Component({
  template: `
    <suggestion-list (picked)="value = $event" [candidates]="candidates">
      <ion-input [value]="value" label="Roaster" />
    </suggestion-list>
  `,
  imports: [SuggestionListComponent, IonInput],
})
class IonicHostComponent {
  public value = '';
  public readonly candidates = () => ['Rösterei Nord', 'Rösterei Süd'];
}

describe('SuggestionListComponent around an Ionic text field', () => {
  let fixture: ComponentFixture<IonicHostComponent>;
  let field: HTMLIonInputElement;
  let native: HTMLInputElement;

  beforeAll(() => {
    defineInput();
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [IonicHostComponent, TranslateModule.forRoot()],
      providers: [{ provide: LIVE_REGION, useValue: new FakeLiveRegion() }],
    });
    fixture = TestBed.createComponent(IonicHostComponent);
    fixture.detectChanges();
    field = (fixture.nativeElement as HTMLElement).querySelector('ion-input');
    native = await field.getInputElement();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  function type(value: string): void {
    field.value = value;
    field.dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
    fixture.detectChanges();
  }

  function press(key: string): void {
    native.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
  }

  function listbox(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(
      '[role="listbox"]',
    );
  }

  function option(name: string): HTMLElement {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '[role="option"]',
      ),
    ).find((each) => each.textContent.trim() === name);
  }

  it('makes the native field a combobox that points to the list and its active option', async () => {
    expect(native.getAttribute('role')).toBe('combobox');
    expect(native.getAttribute('aria-autocomplete')).toBe('list');
    expect(native.getAttribute('aria-expanded')).toBe('false');
    expect(native.hasAttribute('aria-controls')).toBeFalse();

    field.dispatchEvent(new CustomEvent('ionFocus', { bubbles: true }));
    type('rös');

    expect(native.getAttribute('aria-expanded')).toBe('true');
    expect(native.getAttribute('aria-controls')).toBe(listbox().id);
    expect(native.hasAttribute('aria-activedescendant')).toBeFalse();

    press('ArrowDown');
    const north = option('Rösterei Nord');
    expect(north.getAttribute('aria-selected')).toBe('true');
    expect(native.getAttribute('aria-activedescendant')).toBe(north.id);

    press('ArrowDown');
    const south = option('Rösterei Süd');
    expect(south.getAttribute('aria-selected')).toBe('true');
    expect(north.getAttribute('aria-selected')).toBe('false');
    expect(native.getAttribute('aria-activedescendant')).toBe(south.id);

    press('Enter');
    await fixture.whenStable();

    expect(listbox()).toBeNull();
    expect(native.getAttribute('aria-expanded')).toBe('false');
    expect(native.hasAttribute('aria-controls')).toBeFalse();
    expect(native.hasAttribute('aria-activedescendant')).toBeFalse();
    expect(native.value).toBe('Rösterei Süd');
  });

  it('leaves the typed text in the field when Escape closes the list', async () => {
    field.dispatchEvent(new CustomEvent('ionFocus', { bubbles: true }));
    native.value = 'rös';
    type('rös');
    press('Escape');
    await fixture.whenStable();

    expect(listbox()).toBeNull();
    expect(native.getAttribute('aria-expanded')).toBe('false');
    expect(native.value).toBe('rös');
  });
});
