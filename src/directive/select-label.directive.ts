import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

type StencilElement = HTMLElement & {
  componentOnReady?: () => Promise<unknown>;
};

/**
 * Keeps the visible label of an ion-select out of the screen reader's swipe
 * order. Ionic names the select's button "label, value" already, so TalkBack
 * and VoiceOver otherwise stop on the label text and then on the button that
 * says it again. The label stays visible and still opens the select on a tap.
 */
@Directive({ selector: 'ion-select' })
export class SelectLabelDirective {
  constructor() {
    const host = inject<ElementRef<StencilElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    // The directive can run before Ionic has defined and rendered the element.
    const loaded = customElements
      .whenDefined(host.localName)
      .then(() => host.componentOnReady?.());
    void loaded.then(() => {
      if (!destroyRef.destroyed) {
        host.shadowRoot
          ?.querySelector('.label-text-wrapper')
          ?.setAttribute('aria-hidden', 'true');
      }
    });
  }
}
