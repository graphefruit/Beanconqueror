import { Directive, ElementRef, inject } from '@angular/core';

type StencilElement = HTMLElement & {
  componentOnReady?: () => Promise<unknown>;
};

/**
 * Makes an ion-icon that does something on a tap a button: it is reached
 * with Tab and runs its click with Enter or Space. Its name comes from its
 * aria-label.
 */
@Directive({
  selector: 'ion-icon[iconButton]',
  host: {
    tabindex: '0',
    '(keydown.enter)': 'activate($event)',
    '(keydown.space)': 'activate($event)',
  },
})
export class IconButtonDirective {
  private readonly host =
    inject<ElementRef<StencilElement>>(ElementRef).nativeElement;

  constructor() {
    // ion-icon sets role="img" when it renders; the role is set after that.
    const loaded = this.host.componentOnReady?.() ?? Promise.resolve();
    void loaded.then(() => this.host.setAttribute('role', 'button'));
  }

  protected activate(event: Event): void {
    // Space would scroll the page; a key held down would repeat the action.
    event.preventDefault();
    if (!(event as KeyboardEvent).repeat) {
      this.host.click();
    }
  }
}
