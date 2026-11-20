import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/** How long further clicks after the first one are ignored. */
export const DOUBLE_CLICK_LOCK_MS = 500;

/**
 * Ignores clicks on the host for a moment after a click, so a double tap on
 * Save saves once. The host stays enabled: a disabled button loses focus, and
 * keyboard and screen reader users would lose their place in the dialog.
 * Screen readers hear it as unavailable (aria-disabled) meanwhile.
 */
@Directive({ selector: '[disable-double-click]' })
export class DisableDoubleClickDirective {
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // Capture: before the click handlers of the host.
    this.host.addEventListener('click', this.onClick, true);
    inject(DestroyRef).onDestroy(() => {
      this.host.removeEventListener('click', this.onClick, true);
      clearTimeout(this.timer);
    });
  }

  private readonly onClick = (event: Event): void => {
    if (this.timer !== undefined) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
    this.setUnavailable(true);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.setUnavailable(false);
    }, DOUBLE_CLICK_LOCK_MS);
  };

  /** On the element with the button role: ion-button's native button. */
  private setUnavailable(unavailable: boolean): void {
    const button = this.host.shadowRoot?.querySelector('button') ?? this.host;
    if (unavailable) {
      button.setAttribute('aria-disabled', 'true');
    } else {
      button.removeAttribute('aria-disabled');
    }
  }
}
