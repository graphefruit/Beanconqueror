import { Component } from '@angular/core';
import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { LongPressDirective } from '../long-press.directive';

@Component({
  imports: [LongPressDirective],
  template: `<button
    (click)="taps = taps + 1"
    (long-press)="longPresses = longPresses + 1"
  >
    Add
  </button>`,
})
class HostComponent {
  public taps = 0;
  public longPresses = 0;
}

describe('LongPressDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let button: HTMLButtonElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    button = (fixture.nativeElement as HTMLElement).querySelector('button');
  });

  function holdAndRelease(ms: number): void {
    button.dispatchEvent(new Event('touchstart'));
    tick(ms);
    button.dispatchEvent(new Event('touchend'));
  }

  it('leaves a click alone, as keyboards and screen readers send it', fakeAsync(() => {
    button.click();

    expect(fixture.componentInstance.taps).toBe(1);
    expect(fixture.componentInstance.longPresses).toBe(0);
  }));

  it('does not tap as well when a long press ends in a click', fakeAsync(() => {
    holdAndRelease(600);
    button.click();

    expect(fixture.componentInstance.longPresses).toBe(1);
    expect(fixture.componentInstance.taps).toBe(0);

    tick(1000);
    button.click();
    expect(fixture.componentInstance.taps).toBe(1);
    discardPeriodicTasks();
  }));

  it('takes a short press for a tap', fakeAsync(() => {
    holdAndRelease(100);
    button.click();

    expect(fixture.componentInstance.longPresses).toBe(0);
    expect(fixture.componentInstance.taps).toBe(1);
  }));
});
