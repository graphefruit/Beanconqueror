import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { defineCustomElement as defineSegmentButton } from '@ionic/core/components/ion-segment-button.js';
import { defineCustomElement as defineSegment } from '@ionic/core/components/ion-segment.js';

import { TabPanelDirective } from '../tab-panel.directive';

@Component({
  imports: [TabPanelDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-segment [value]="value()">
      <ion-segment-button value="general">General</ion-segment-button>
      <ion-segment-button value="roast">Roast</ion-segment-button>
    </ion-segment>
    <p>Not part of the tabs</p>
    <div appTabPanel>Content</div>
  `,
})
class HostComponent {
  public readonly value = signal('general');
}

/** Ionic renders and marks the selection asynchronously. */
async function until(condition: () => boolean): Promise<void> {
  for (let frame = 0; frame < 120 && !condition(); frame++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

describe('TabPanelDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let buttons: HTMLIonSegmentButtonElement[];
  let panel: HTMLElement;

  function tab(index: number): HTMLElement {
    return buttons[index].shadowRoot.querySelector('[role="tab"]');
  }

  function linkedTo(index: number): boolean {
    return (
      panel.getAttribute('aria-labelledby') === buttons[index].id &&
      tab(index)?.ariaControlsElements?.[0] === panel
    );
  }

  beforeAll(() => {
    defineSegment();
    defineSegmentButton();
  });

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    const host = fixture.nativeElement as HTMLElement;
    buttons = [...host.querySelectorAll('ion-segment-button')];
    panel = host.querySelector('[appTabPanel]');
    await until(() => linkedTo(0));
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('makes the host the panel of the selected tab', () => {
    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(linkedTo(0)).toBeTrue();
    expect(tab(1).ariaControlsElements).toBeNull();
  });

  it('follows the selection', async () => {
    fixture.componentInstance.value.set('roast');
    await until(() => linkedTo(1));

    expect(linkedTo(1)).toBeTrue();
    expect(tab(0).ariaControlsElements).toBeNull();
    expect(buttons[0].id).not.toBe(buttons[1].id);
  });

  it('is named by no tab while none is selected', async () => {
    fixture.componentInstance.value.set('none');
    await until(() => !panel.hasAttribute('aria-labelledby'));

    expect(panel.hasAttribute('aria-labelledby')).toBeFalse();
    expect(tab(0).ariaControlsElements).toBeNull();
  });
});
