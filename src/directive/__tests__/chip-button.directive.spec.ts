import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChipButtonDirective } from '../chip-button.directive';

@Component({
  imports: [ChipButtonDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-chip id="action" [chipButton]="name()" (click)="clicks = clicks + 1"
      >Scale</ion-chip
    >
    <ion-chip id="toggle" chipButton [chipPressed]="on()">Weight</ion-chip>
    <ion-chip id="info">Info</ion-chip>
  `,
})
class HostComponent {
  public readonly name = signal('Remove tool: Scale');
  public readonly on = signal(true);
  public clicks = 0;
}

describe('ChipButtonDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  function chip(id: string): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector(`#${id}`);
  }

  function press(id: string, key: string, repeat = false): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key,
      repeat,
      cancelable: true,
    });
    chip(id).dispatchEvent(event);
    return event;
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('makes an action chip a named button reached with Tab', () => {
    expect(chip('action').getAttribute('role')).toBe('button');
    expect(chip('action').tabIndex).toBe(0);
    expect(chip('action').getAttribute('aria-label')).toBe(
      'Remove tool: Scale',
    );
    expect(chip('action').hasAttribute('aria-pressed')).toBe(false);
  });

  it('runs the click with Enter and Space, once per press', () => {
    const space = press('action', ' ');
    press('action', 'Enter');
    press('action', 'Enter', true);

    expect(fixture.componentInstance.clicks).toBe(2);
    expect(space.defaultPrevented).toBe(true);
  });

  it('says whether a switching chip is on and keeps its text as name', () => {
    expect(chip('toggle').getAttribute('aria-pressed')).toBe('true');
    expect(chip('toggle').hasAttribute('aria-label')).toBe(false);

    fixture.componentInstance.on.set(false);
    fixture.detectChanges();

    expect(chip('toggle').getAttribute('aria-pressed')).toBe('false');
  });

  it('leaves chips that only inform alone', () => {
    expect(chip('info').hasAttribute('role')).toBe(false);
    expect(chip('info').hasAttribute('tabindex')).toBe(false);
  });
});
