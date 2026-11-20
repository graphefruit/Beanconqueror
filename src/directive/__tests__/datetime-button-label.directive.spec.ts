import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatetimeButtonLabelDirective } from '../datetime-button-label.directive';

@Component({
  imports: [DatetimeButtonLabelDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<span id="fromLabel">Von</span>
    <test-datetime-button datetimeLabel="fromLabel" />`,
})
class HostComponent {}

describe('DatetimeButtonLabelDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  it('names the date button after the label once Ionic renders it', async () => {
    TestBed.overrideDirective(DatetimeButtonLabelDirective, {
      set: { selector: 'test-datetime-button[datetimeLabel]' },
    });
    fixture = TestBed.createComponent(HostComponent);
    const host: HTMLElement = fixture.nativeElement;
    const root = host
      .querySelector('test-datetime-button')
      .attachShadow({ mode: 'open' });
    fixture.detectChanges();
    await fixture.whenStable();

    // Ionic renders the button when it has found its ion-datetime.
    root.innerHTML = '<button id="date-button">1. Nov. 2026</button>';
    await new Promise((resolve) => setTimeout(resolve));

    const button = root.querySelector('button');
    expect(button.ariaLabelledByElements).toEqual([
      host.querySelector('#fromLabel'),
      button,
    ]);
  });
});
