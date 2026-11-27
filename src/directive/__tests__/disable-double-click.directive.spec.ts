import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { defineCustomElement as defineButton } from '@ionic/core/components/ion-button.js';

import {
  DisableDoubleClickDirective,
  DOUBLE_CLICK_LOCK_MS,
} from '../disable-double-click.directive';

@Component({
  imports: [DisableDoubleClickDirective],
  template: `<button disable-double-click (click)="saves = saves + 1">
    Save
  </button>`,
})
class HostComponent {
  public saves = 0;
}

@Component({
  imports: [DisableDoubleClickDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<ion-button disable-double-click>Save</ion-button>`,
})
class IonButtonHostComponent {}

describe('DisableDoubleClickDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let button: HTMLButtonElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    button = (fixture.nativeElement as HTMLElement).querySelector('button');
    document.body.append(fixture.nativeElement as HTMLElement);
  });

  afterEach(() => (fixture.nativeElement as HTMLElement).remove());

  it('keeps the button enabled and focused after a click', fakeAsync(() => {
    button.focus();
    button.click();

    expect(button.disabled).toBeFalse();
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    tick(DOUBLE_CLICK_LOCK_MS);
    expect(button.hasAttribute('aria-disabled')).toBeFalse();
  }));

  it('runs the action of a double click once', fakeAsync(() => {
    button.click();
    button.click();
    expect(fixture.componentInstance.saves).toBe(1);

    tick(DOUBLE_CLICK_LOCK_MS);
    button.click();
    expect(fixture.componentInstance.saves).toBe(2);
    tick(DOUBLE_CLICK_LOCK_MS);
  }));

  // Save in the forms is an ion-button: the role sits on its native button.
  it('marks the native button of an ion-button and leaves the host enabled', async () => {
    defineButton();
    const ionFixture = TestBed.createComponent(IonButtonHostComponent);
    ionFixture.detectChanges();
    const host = (ionFixture.nativeElement as HTMLElement).querySelector(
      'ion-button',
    );
    // Ionic renders the native button asynchronously.
    for (
      let frame = 0;
      frame < 120 && !host.shadowRoot?.querySelector('button');
      frame++
    ) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const native = host.shadowRoot.querySelector('button');
    jasmine.clock().install();
    try {
      host.click();

      expect(host.hasAttribute('disabled')).toBeFalse();
      expect(native.disabled).toBeFalse();
      expect(native.getAttribute('aria-disabled')).toBe('true');
      jasmine.clock().tick(DOUBLE_CLICK_LOCK_MS);
      expect(native.hasAttribute('aria-disabled')).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
      ionFixture.destroy();
    }
  });
});
