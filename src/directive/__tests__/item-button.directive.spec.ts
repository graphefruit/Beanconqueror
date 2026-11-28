import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { defineCustomElement as defineItem } from '@ionic/core/components/ion-item.js';
import { defineCustomElement as defineList } from '@ionic/core/components/ion-list.js';

import { ItemButtonDirective } from '../item-button.directive';

@Component({
  imports: [ItemButtonDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-list>
      <ion-item
        id="choice"
        itemButton
        [itemPressed]="chosen()"
        (click)="clicks = clicks + 1"
      >
        <ion-label>Bean name</ion-label>
      </ion-item>
      <ion-item id="more" itemButton [itemExpanded]="open()">More</ion-item>
      <ion-item id="plain">Plain</ion-item>
    </ion-list>
  `,
})
class HostComponent {
  public readonly chosen = signal(false);
  public readonly open = signal(true);
  public clicks = 0;
}

/** Ionic's own items render in the next frame. */
async function rendered(): Promise<void> {
  for (let frame = 0; frame < 3; frame++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

describe('ItemButtonDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  function item(id: string): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector(`#${id}`);
  }

  function press(key: string, repeat = false): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key,
      repeat,
      cancelable: true,
    });
    item('choice').dispatchEvent(event);
    return event;
  }

  beforeAll(() => {
    defineList();
    defineItem();
  });

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await rendered();
  });

  it('makes an item in a list a button reached with Tab, whenever Ionic renders it', async () => {
    expect(item('plain').getAttribute('role')).toBe('listitem');
    expect(item('choice').getAttribute('role')).toBe('button');
    expect(item('choice').tabIndex).toBe(0);

    // A later render of the item keeps the role.
    item('choice').setAttribute('lines', 'none');
    await rendered();
    expect(item('choice').getAttribute('role')).toBe('button');
    item('choice').setAttribute('role', 'listitem');
    await rendered();
    expect(item('choice').getAttribute('role')).toBe('button');
  });

  it('lets go of the item when it is removed', () => {
    const disconnect = spyOn(MutationObserver.prototype, 'disconnect');

    fixture.destroy();

    expect(disconnect).toHaveBeenCalledTimes(2);
  });

  it('tells whether a choice is chosen', () => {
    expect(item('choice').getAttribute('aria-pressed')).toBe('false');
    expect(item('choice').hasAttribute('aria-expanded')).toBeFalse();

    fixture.componentInstance.chosen.set(true);
    fixture.detectChanges();

    expect(item('choice').getAttribute('aria-pressed')).toBe('true');
  });

  it('tells whether what a switch shows is open', () => {
    expect(item('more').getAttribute('aria-expanded')).toBe('true');
    expect(item('more').hasAttribute('aria-pressed')).toBeFalse();

    fixture.componentInstance.open.set(false);
    fixture.detectChanges();

    expect(item('more').getAttribute('aria-expanded')).toBe('false');
  });

  it('runs the click with Enter and Space, once per press', () => {
    const space = press(' ');
    press('Enter');
    press('Enter', true);

    expect(fixture.componentInstance.clicks).toBe(2);
    expect(space.defaultPrevented).toBeTrue();
  });
});
