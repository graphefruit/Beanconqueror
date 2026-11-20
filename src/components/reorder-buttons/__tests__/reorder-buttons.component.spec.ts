import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LIVE_REGION } from '../../../services/a11y/live-region';
import {
  ReorderButtonsComponent,
  ReorderMove,
} from '../reorder-buttons.component';

/** A list that moves its entries as the app's sortable lists do. */
@Component({
  imports: [ReorderButtonsComponent],
  template: `
    @for (entry of entries(); track entry; let i = $index, count = $count) {
      <div class="entry">
        <app-reorder-buttons
          [index]="i"
          [count]="count"
          [name]="entry"
          (moved)="move($event)"
        />
      </div>
    }
  `,
})
class ListComponent {
  public readonly entries = signal(['Mahlgrad', 'Wassermenge', 'Notizen']);

  public move({ from, to }: ReorderMove): void {
    const entries = [...this.entries()];
    entries.splice(to, 0, entries.splice(from, 1)[0]);
    this.entries.set(entries);
  }
}

/** Ionic moves the name of ion-button to the button in its shadow root. */
function nameOf(button: HTMLElement): string | null {
  return (
    button.shadowRoot?.querySelector('button')?.getAttribute('aria-label') ??
    button.getAttribute('aria-label')
  );
}

describe('ReorderButtonsComponent', () => {
  let fixture: ComponentFixture<ListComponent>;
  let heard: string[];

  function buttons(entry: number): HTMLElement[] {
    const row = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.entry',
    )[entry];
    return [...row.querySelectorAll<HTMLElement>('ion-button')];
  }

  beforeEach(async () => {
    heard = [];
    TestBed.configureTestingModule({
      imports: [ListComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: LIVE_REGION,
          useValue: { announce: (message: string) => heard.push(message) },
        },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      A11Y: {
        MOVE_UP: '{{name}} nach oben',
        MOVE_DOWN: '{{name}} nach unten',
        MOVED_TO_POSITION: '{{name}}: Position {{position}} von {{count}}',
      },
    });
    translate.use('de');
    fixture = TestBed.createComponent(ListComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('names both buttons after the entry and offers only possible moves', () => {
    const [up, down] = buttons(0);

    expect(nameOf(up)).toBe('Mahlgrad nach oben');
    expect(nameOf(down)).toBe('Mahlgrad nach unten');
    expect((up as HTMLIonButtonElement).disabled).toBe(true);
    expect((down as HTMLIonButtonElement).disabled).toBe(false);
    expect((buttons(2)[1] as HTMLIonButtonElement).disabled).toBe(true);
  });

  it('moves the entry, says where it is now and keeps the focus on it', async () => {
    buttons(0)[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.entries()).toEqual([
      'Wassermenge',
      'Mahlgrad',
      'Notizen',
    ]);
    expect(heard).toEqual(['Mahlgrad: Position 2 von 3']);
    expect(document.activeElement).toBe(buttons(1)[1]);
  });

  it('hands the focus to the other button at the end of the list', async () => {
    buttons(1)[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.entries()[2]).toBe('Wassermenge');
    expect(document.activeElement).toBe(buttons(2)[0]);
  });
});
