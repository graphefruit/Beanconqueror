import { computed, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Makes an ion-chip that does something on a tap a button: it is reached with
 * Tab, runs its click with Enter or Space and is named by `chipButton`, or by
 * its text when that is empty. A chip that switches something on and off,
 * like a line of a graph, says whether it is on (`chipPressed`). Chips that
 * only show information stay without these.
 */
@Directive({
  selector: 'ion-chip[chipButton]',
  host: {
    role: 'button',
    tabindex: '0',
    '[attr.aria-label]': 'chipButton() || null',
    '[attr.aria-pressed]': 'pressedState()',
    '(keydown.enter)': 'activate($event)',
    '(keydown.space)': 'activate($event)',
  },
})
export class ChipButtonDirective {
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** What a tap does, e.g. "Remove tool: Scale"; empty to use the text. */
  public readonly chipButton = input<string>('');
  /** Whether what the chip switches is on; undefined for an action. */
  public readonly chipPressed = input<boolean | null | undefined>(undefined);

  protected readonly pressedState = computed(() => {
    const pressed = this.chipPressed();
    return pressed === undefined ? null : String(!!pressed);
  });

  protected activate(event: Event): void {
    // Space would scroll the page; a key held down would repeat the action.
    event.preventDefault();
    if (!(event as KeyboardEvent).repeat) {
      this.host.click();
    }
  }
}
