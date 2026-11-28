import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ContentChild,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';

import { IonInput, IonItem } from '@ionic/angular';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import {
  Announcer,
  ProgressAnnouncement,
} from '../../services/a11y/announcer.service';

/** The most suggestions shown at once. */
export const SUGGESTION_LIMIT = 8;

/**
 * Picking a suggestion by touch leaves the field before the tap arrives, so
 * the list stays this long after the field lost focus.
 */
const CLOSE_AFTER_BLUR_MS = 150;

/** The values of `pool` that contain `query`, ignoring case, in their order. */
export function matchSuggestions(
  pool: readonly string[],
  query: string,
  limit = SUGGESTION_LIMIT,
): string[] {
  const needle = query.toLowerCase();
  const hits: string[] = [];
  if (needle === '') {
    return hits;
  }
  for (const value of pool) {
    if (value.toLowerCase().includes(needle)) {
      hits.push(value);
      if (hits.length === limit) {
        break;
      }
    }
  }
  return hits;
}

/** A suggestion split around the first place it contains the query. */
export interface SuggestionParts {
  before: string;
  match: string;
  after: string;
}

export function splitAtMatch(
  suggestion: string,
  query: string,
): SuggestionParts {
  const lower = suggestion.toLowerCase();
  const needle = query.toLowerCase();
  // Lower case can change the length of a text (e.g. "İ"); its positions would not fit.
  const start =
    needle !== '' && lower.length === suggestion.length
      ? lower.indexOf(needle)
      : -1;
  if (start < 0) {
    return { before: suggestion, match: '', after: '' };
  }
  const end = start + needle.length;
  return {
    before: suggestion.slice(0, start),
    match: suggestion.slice(start, end),
    after: suggestion.slice(end),
  };
}

let nextListId = 0;

/**
 * Suggests values for the first text field placed inside it, as a combobox
 * with a listbox below the field: arrow keys move through the suggestions,
 * Enter picks one, Escape closes the list. The number of suggestions is
 * announced. Other fields placed inside it, such as a weight next to a name,
 * do not open the list.
 */
@Component({
  selector: 'suggestion-list',
  templateUrl: './suggestion-list.component.html',
  styleUrls: ['./suggestion-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonItem, TranslatePipe],
  host: {
    '(ionFocus)': 'onFocus($event)',
    '(ionInput)': 'onInput($event)',
    '(ionBlur)': 'onBlur($event)',
    '(keydown)': 'onKeydown($event)',
    '(click)': 'onClick($event)',
  },
})
export class SuggestionListComponent<T = string>
  implements AfterContentInit, OnDestroy
{
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly announcer = inject(Announcer);
  private readonly translate = inject(TranslateService);

  /**
   * Every value to suggest from, in the order to suggest them. Called once
   * each time the field gets focus, not on every key.
   */
  public readonly candidates = input.required<() => readonly T[]>();
  /** How a candidate reads in the list and what typing matches. */
  public readonly label = input<(value: T) => string>(String);
  public readonly picked = output<T>();

  @ContentChild(IonInput) private field?: IonInput;

  public readonly listId = `suggestion-list-${nextListId++}`;
  public readonly results = signal<readonly string[]>([]);
  public readonly activeIndex = signal(-1);
  private readonly query = signal('');
  public readonly options = computed(() =>
    this.results().map((value) => ({
      value,
      ...splitAtMatch(value, this.query()),
    })),
  );

  private readonly nativeInput = signal<HTMLInputElement | undefined>(
    undefined,
  );
  /** The candidates by their label, which keeps the first of equal ones. */
  private pool = new Map<string, T>();
  private focused = false;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private announcement: ProgressAnnouncement | undefined;

  constructor() {
    effect(() => {
      const nativeInput = this.nativeInput();
      if (!nativeInput) {
        return;
      }
      const open = this.results().length > 0;
      const active = this.activeIndex();
      nativeInput.setAttribute('aria-expanded', String(open));
      setOrRemove(nativeInput, 'aria-controls', open ? this.listId : null);
      setOrRemove(
        nativeInput,
        'aria-activedescendant',
        active >= 0 ? this.optionId(active) : null,
      );
    });
  }

  public ngAfterContentInit(): void {
    const field = this.field;
    if (!field) {
      return;
    }
    // ion-input copies ARIA attributes to its native field only once, so the
    // combobox attributes are set on the native field itself.
    customElements
      .whenDefined('ion-input')
      .then(() => field.getInputElement())
      .then((nativeInput) => {
        nativeInput.setAttribute('role', 'combobox');
        nativeInput.setAttribute('aria-autocomplete', 'list');
        this.nativeInput.set(nativeInput);
      })
      // Without the native field the suggestions still work, only without
      // the combobox semantics.
      .catch(() => undefined);
  }

  public ngOnDestroy(): void {
    clearTimeout(this.closeTimer);
    this.announcement?.end();
  }

  public optionId(index: number): string {
    return `${this.listId}-${index}`;
  }

  public onFocus(event: Event): void {
    if (!this.fromField(event)) {
      return;
    }
    clearTimeout(this.closeTimer);
    this.focused = true;
    const label = this.label();
    this.pool = new Map();
    for (const candidate of this.candidates()()) {
      const text = label(candidate);
      if (!this.pool.has(text)) {
        this.pool.set(text, candidate);
      }
    }
  }

  public onInput(event: Event): void {
    if (!this.focused || !this.fromField(event)) {
      return;
    }
    const value = (event.target as { value?: unknown } | null)?.value;
    // A space typed first is dropped; one after the text still narrows the
    // suggestions to those with a following word.
    this.query.set(typeof value === 'string' ? value.trimStart() : '');
    this.show(matchSuggestions([...this.pool.keys()], this.query()));
  }

  public onBlur(event: Event): void {
    if (!this.fromField(event)) {
      return;
    }
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.focused = false;
      this.close();
    }, CLOSE_AFTER_BLUR_MS);
  }

  public onKeydown(event: KeyboardEvent): void {
    const count = this.results().length;
    if (count === 0 || !this.fromField(event)) {
      return;
    }
    const active = this.activeIndex();
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const next =
          active < 0
            ? step > 0
              ? 0
              : count - 1
            : (active + step + count) % count;
        this.activeIndex.set(next);
        this.host.nativeElement
          .querySelector(`#${this.optionId(next)}`)
          ?.scrollIntoView?.({ block: 'nearest' });
        break;
      }
      case 'Enter':
        if (active >= 0) {
          event.preventDefault();
          this.pick(this.results()[active]);
        }
        break;
      case 'Escape':
        // Closes the list only, not the dialog the field is in.
        event.preventDefault();
        event.stopPropagation();
        this.close();
        break;
    }
  }

  /**
   * The options take no focus: the keyboard stays in the field, which points
   * to the active option. So a tap on an option is picked up here.
   */
  public onClick(event: Event): void {
    const option = (event.target as Element | null)?.closest('[role="option"]');
    const index = this.results().findIndex(
      (_, i) => option?.id === this.optionId(i),
    );
    if (index >= 0) {
      this.pick(this.results()[index]);
    }
  }

  /** Picks the candidate shown as `label`. */
  public pick(label: string): void {
    const candidate = this.pool.get(label);
    if (candidate !== undefined) {
      this.picked.emit(candidate);
    }
    this.close();
  }

  private fromField(event: Event): boolean {
    const field = this.host.nativeElement.querySelector('ion-input');
    return !field || field.contains(event.target as Node | null);
  }

  private show(results: string[]): void {
    this.results.set(results);
    this.activeIndex.set(-1);
    if (results.length === 0) {
      this.endAnnouncement();
      return;
    }
    const message = this.translate.instant(
      results.length === 1
        ? 'SUGGESTIONS_COUNT_ONE'
        : 'SUGGESTIONS_COUNT_OTHER',
      { count: results.length },
    );
    if (this.announcement) {
      this.announcement.update(message);
    } else {
      this.announcement = this.announcer.startProgress(message);
    }
  }

  private close(): void {
    this.results.set([]);
    this.activeIndex.set(-1);
    this.endAnnouncement();
  }

  private endAnnouncement(): void {
    this.announcement?.end();
    this.announcement = undefined;
  }
}

function setOrRemove(
  element: HTMLElement,
  name: string,
  value: string | null,
): void {
  if (value === null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, value);
  }
}
