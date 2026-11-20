import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  NgZone,
} from '@angular/core';

let nextId = 0;

/** The nearest ion-segment before `panel` among its siblings. */
function segmentBefore(panel: Element): HTMLIonSegmentElement | null {
  for (
    let sibling = panel.previousElementSibling;
    sibling;
    sibling = sibling.previousElementSibling
  ) {
    if (sibling.localName === 'ion-segment') {
      return sibling as HTMLIonSegmentElement;
    }
  }
  return null;
}

/**
 * Names `panel` after the selected tab of `segment` and lets that tab, and no
 * other, point to it. The tab is the button Ionic renders in the shadow root
 * of ion-segment-button, which an ID in aria-controls cannot reach; an
 * element reference from there to the page can. The panel takes its name from
 * the ion-segment-button, whose content is the tab's label.
 */
function linkSelectedTab(
  segment: HTMLIonSegmentElement,
  panel: HTMLElement,
): void {
  let selected: HTMLIonSegmentButtonElement | undefined;
  for (const button of segment.querySelectorAll<HTMLIonSegmentButtonElement>(
    'ion-segment-button',
  )) {
    const isSelected =
      selected === undefined && String(button.value) === String(segment.value);
    if (isSelected) {
      selected = button;
    }
    const tab = button.shadowRoot?.querySelector('[role="tab"]');
    if (tab) {
      tab.ariaControlsElements = isSelected ? [panel] : null;
    }
  }
  if (selected) {
    selected.id ||= `segment-tab-${nextId++}`;
    panel.setAttribute('aria-labelledby', selected.id);
  } else {
    panel.removeAttribute('aria-labelledby');
  }
}

/**
 * Makes the host the tab panel of the ion-segment before it. Ionic gives the
 * segment the roles tablist and tab with aria-selected; arrow keys, Home and
 * End move the focus between the tabs and Enter or Space selects one. What
 * Ionic leaves out is the panel the selected tab shows, so a screen reader
 * cannot tell where its content starts.
 */
@Directive({ selector: '[appTabPanel]', host: { role: 'tabpanel' } })
export class TabPanelDirective {
  constructor() {
    const panel = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const zone = inject(NgZone);
    let observer: MutationObserver | undefined;

    afterNextRender(() => {
      const segment = segmentBefore(panel);
      if (!segment) {
        return;
      }
      const update = () => linkSelectedTab(segment, panel);
      // Ionic marks the selected button with a class, also once it has
      // loaded; tabs come and go with the template. No Angular state changes.
      zone.runOutsideAngular(() => {
        observer = new MutationObserver(update);
        observer.observe(segment, {
          subtree: true,
          childList: true,
          attributeFilter: ['class'],
        });
      });
      update();
    });
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }
}
