import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IconButtonDirective } from '../icon-button.directive';

@Component({
  imports: [IconButtonDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<ion-icon
    iconButton
    role="img"
    aria-label="Add aroma"
    (click)="clicks = clicks + 1"
  />`,
})
class HostComponent {
  public clicks = 0;
}

describe('IconButtonDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let icon: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    icon = (fixture.nativeElement as HTMLElement).querySelector('ion-icon');
  });

  it('is a button reached with Tab, after the icon set its own role', () => {
    expect(icon.getAttribute('role')).toBe('button');
    expect(icon.tabIndex).toBe(0);
    expect(icon.getAttribute('aria-label')).toBe('Add aroma');
  });

  it('runs the click with Enter and Space', () => {
    const space = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
    icon.dispatchEvent(space);
    icon.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(fixture.componentInstance.clicks).toBe(2);
    expect(space.defaultPrevented).toBe(true);
  });
});
