import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  NgZone,
} from '@angular/core';

type StencilElement = HTMLElement & {
  componentOnReady?: () => Promise<unknown>;
};

let nextId = 0;

/**
 * Names a checkbox or toggle after its title (`.field-label`) and links the
 * explanation below it (`p`) as its description. Without this, the name is
 * the whole text, title and explanation in one, which makes moving through a
 * list of settings slow; an explanation that repeats the title is left out.
 * Buttons keep their whole text as name: a name must contain all the text a
 * button shows, so voice control finds it by what is on screen.
 */
@Directive({ selector: 'ion-checkbox, ion-toggle' })
export class ControlDescriptionDirective {
  private readonly host =
    inject<ElementRef<StencilElement>>(ElementRef).nativeElement;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const zone = inject(NgZone);
    let observer: MutationObserver | undefined;
    const loaded = this.host.componentOnReady?.() ?? Promise.resolve();
    void loaded.then(() => {
      if (destroyRef.destroyed) {
        return;
      }
      this.describe();
      // Texts change with the app language and with the setting itself.
      zone.runOutsideAngular(() => {
        observer = new MutationObserver(() => this.describe());
        observer.observe(this.host, {
          subtree: true,
          childList: true,
          characterData: true,
        });
      });
    });
    destroyRef.onDestroy(() => observer?.disconnect());
  }

  private describe(): void {
    const title = this.host.querySelector<HTMLElement>('.field-label');
    const description = this.host.querySelector<HTMLElement>('p');
    if (!title || !description) {
      return;
    }
    const repeatsTitle =
      description.textContent.trim() === title.textContent.trim();
    const name = title.textContent.trim();
    if (this.host.getAttribute('aria-label') !== name) {
      this.host.setAttribute('aria-label', name);
    }
    if (repeatsTitle) {
      this.host.removeAttribute('aria-describedby');
    } else {
      description.id ||= `control-description-${nextId++}`;
      this.host.setAttribute('aria-describedby', description.id);
    }
  }
}
