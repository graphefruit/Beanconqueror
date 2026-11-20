import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  NgZone,
} from '@angular/core';

type StencilElement = HTMLElement & {
  componentOnReady?: () => Promise<unknown>;
};

/**
 * Names the button of an ion-datetime-button after the visible label with
 * the ID `datetimeLabel`, followed by the date it shows, e.g. "From, 1 Nov
 * 2026". The button is in Ionic's shadow root, which an ID cannot reach; an
 * element reference from there to the page can. Ionic renders the button
 * only once it has found its ion-datetime.
 */
@Directive({ selector: 'ion-datetime-button[datetimeLabel]' })
export class DatetimeButtonLabelDirective {
  private readonly host =
    inject<ElementRef<StencilElement>>(ElementRef).nativeElement;

  /** The ID of the visible label, e.g. of "From". */
  public readonly datetimeLabel = input.required<string>();

  constructor() {
    const destroyRef = inject(DestroyRef);
    const zone = inject(NgZone);
    let observer: MutationObserver | undefined;
    const loaded = this.host.componentOnReady?.() ?? Promise.resolve();
    void loaded.then(() => {
      const root = this.host.shadowRoot;
      if (!root || destroyRef.destroyed) {
        return;
      }
      this.label(root);
      zone.runOutsideAngular(() => {
        observer = new MutationObserver(() => this.label(root));
        observer.observe(root, { childList: true });
      });
    });
    destroyRef.onDestroy(() => observer?.disconnect());
  }

  private label(root: ShadowRoot): void {
    const button = root.querySelector<HTMLElement>('#date-button');
    const label = (this.host.getRootNode() as ParentNode).querySelector(
      `#${CSS.escape(this.datetimeLabel())}`,
    );
    if (button && label && button.ariaLabelledByElements?.[0] !== label) {
      button.ariaLabelledByElements = [label, button];
    }
  }
}
