import { Directive, ElementRef, inject } from '@angular/core';

type StencilElement = HTMLElement & {
  componentOnReady?: () => Promise<unknown>;
};

/**
 * Says that a tap on the checkbox opens a dialog instead of switching it.
 * When it loads, Ionic moves the aria attributes of the checkbox to its hidden
 * native input, so the attribute is set once it has loaded.
 */
@Directive({ selector: 'ion-checkbox[opensDialog]' })
export class OpensDialogDirective {
  constructor() {
    const host = inject<ElementRef<StencilElement>>(ElementRef).nativeElement;
    // The element may be upgraded only after the directive is created.
    void customElements
      .whenDefined(host.localName)
      .then(() => host.componentOnReady?.())
      .then(() => host.setAttribute('aria-haspopup', 'dialog'));
  }
}
