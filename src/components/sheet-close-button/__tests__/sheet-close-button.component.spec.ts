import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { SheetCloseButtonComponent } from '../sheet-close-button.component';

@Component({
  imports: [SheetCloseButtonComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // The real ion-modal is not needed: the button only looks for its dismiss().
  template: `<ion-modal
    ><div><app-sheet-close-button /></div
  ></ion-modal>`,
})
class SheetHostComponent {}

describe('SheetCloseButtonComponent', () => {
  function render(): { button: HTMLButtonElement; modal: HTMLElement } {
    TestBed.configureTestingModule({
      imports: [SheetHostComponent, TranslateModule.forRoot()],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      A11Y: { CLOSE_DIALOG: 'Dialog schließen' },
    });
    translate.use('de');
    const fixture = TestBed.createComponent(SheetHostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    return {
      button: host.querySelector('app-sheet-close-button button'),
      modal: host.querySelector('ion-modal'),
    };
  }

  it('is a button named after what it does', () => {
    const { button } = render();

    expect(button.type).toBe('button');
    expect(button.textContent.trim()).toBe('Dialog schließen');
  });

  it('closes the sheet it sits in without data, like a tap beside it', () => {
    const { button, modal } = render();
    const dismiss = jasmine
      .createSpy('dismiss')
      .and.returnValue(Promise.resolve(true));
    Object.assign(modal, { dismiss });

    button.click();

    expect(dismiss).toHaveBeenCalledOnceWith(undefined, 'cancel');
  });

  it('takes no space until it has focus', () => {
    const { button } = render();

    expect(button.getBoundingClientRect().height).toBeLessThanOrEqual(1);
  });
});
