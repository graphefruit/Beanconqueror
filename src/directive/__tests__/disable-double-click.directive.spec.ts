import { Component } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

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
});
