import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  NgZone,
  signal,
} from '@angular/core';

let nextId = 0;

/**
 * The nearest ion-segment before `panel`: among its siblings, else inside
 * them, else the same for its ancestors up to the ion-content, whose
 * ion-header holds the segment of a list. A segment inside a sibling, such as
 * a range below the tabs, does not count while a sibling is one.
 */
function segmentBefore(panel: Element): HTMLIonSegmentElement | null {
  for (
    let element: Element | null = panel;
    element;
    element = element.parentElement
  ) {
    const segment = segmentAmongSiblingsBefore(element);
    if (segment || element.localName === 'ion-content') {
      return segment;
    }
  }
  return null;
}

function segmentAmongSiblingsBefore(
  element: Element,
): HTMLIonSegmentElement | null {
  const siblings: Element[] = [];
  for (
    let sibling = element.previousElementSibling;
    sibling;
    sibling = sibling.previousElementSibling
  ) {
    siblings.push(sibling);
  }
  const sibling = siblings.find(
    (candidate): candidate is HTMLIonSegmentElement =>
      candidate.localName === 'ion-segment',
  );
  if (sibling) {
    return sibling;
  }
  for (const candidate of siblings) {
    const inside =
      candidate.querySelector<HTMLIonSegmentElement>('ion-segment');
    if (inside) {
      return inside;
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
 * cannot tell where its content starts. Without a segment before it, the
 * host stays a plain element.
 */
@Directive({ selector: '[appTabPanel]', host: { '[attr.role]': 'role()' } })
export class TabPanelDirective {
  protected readonly role = signal<'tabpanel' | null>(null);

  constructor() {
    const panel = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const zone = inject(NgZone);
    let observer: MutationObserver | undefined;

    afterNextRender(() => {
      const segment = segmentBefore(panel);
      if (!segment) {
        return;
      }
      this.role.set('tabpanel');
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
