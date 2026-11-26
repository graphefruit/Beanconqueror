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

@Component({
  imports: [TabPanelDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-segment value="open">
      <ion-segment-button value="open">Open</ion-segment-button>
    </ion-segment>
    <div class="head">
      <ion-segment value="week">
        <ion-segment-button value="week">Week</ion-segment-button>
      </ion-segment>
    </div>
    <div id="beside" appTabPanel>Content</div>
    <div class="list">
      <div class="head">
        <ion-segment value="archive">
          <ion-segment-button value="archive">Archive</ion-segment-button>
        </ion-segment>
      </div>
      <div id="inside" appTabPanel>Rows</div>
    </div>
    <div class="page">
      <ion-header>
        <ion-segment value="brews">
          <ion-segment-button value="brews">Brews</ion-segment-button>
        </ion-segment>
      </ion-header>
      <ion-content>
        <div class="list">
          <p>Nothing found</p>
          <div id="below-header" appTabPanel>Rows</div>
        </div>
      </ion-content>
    </div>
    <div class="page">
      <ion-header><div>Search</div></ion-header>
      <ion-content>
        <div class="list"><div id="alone" appTabPanel>Rows</div></div>
      </ion-content>
    </div>
  `,
})
class NestedHostComponent {}

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

describe('TabPanelDirective with the segment not beside it', () => {
  let fixture: ComponentFixture<NestedHostComponent>;
  let host: HTMLElement;

  const panel = (id: string) => host.querySelector(`#${id}`);
  const button = (value: string) =>
    host.querySelector(`ion-segment-button[value="${value}"]`);

  beforeAll(() => {
    defineSegment();
    defineSegmentButton();
  });

  beforeEach(async () => {
    fixture = TestBed.createComponent(NestedHostComponent);
    fixture.autoDetectChanges();
    host = fixture.nativeElement as HTMLElement;
    await until(
      () =>
        panel('beside').hasAttribute('aria-labelledby') &&
        panel('inside').hasAttribute('aria-labelledby') &&
        panel('below-header').hasAttribute('aria-labelledby'),
    );
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('takes a segment beside it before one inside a sibling', () => {
    expect(panel('beside').getAttribute('role')).toBe('tabpanel');
    expect(panel('beside').getAttribute('aria-labelledby')).toBe(
      button('open').id,
    );
  });

  it('takes the segment inside a sibling, as in the head of a list', () => {
    expect(panel('inside').getAttribute('role')).toBe('tabpanel');
    expect(panel('inside').getAttribute('aria-labelledby')).toBe(
      button('archive').id,
    );
  });

  it('takes the segment in the header of its page, as above a list', () => {
    expect(panel('below-header').getAttribute('role')).toBe('tabpanel');
    expect(panel('below-header').getAttribute('aria-labelledby')).toBe(
      button('brews').id,
    );
  });

  it('is no tab panel without a segment in its page', () => {
    expect(panel('alone').hasAttribute('role')).toBeFalse();
    expect(panel('alone').hasAttribute('aria-labelledby')).toBeFalse();
  });
});
