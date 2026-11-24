import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  signal,
  WritableSignal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ScreenReaderState } from '../../../services/a11y/screen-reader-state.service';
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
  let screenReaderOn: WritableSignal<boolean>;
  let fixture: ComponentFixture<SheetHostComponent>;

  beforeEach(() => {
    screenReaderOn = signal(true);
    TestBed.configureTestingModule({
      imports: [SheetHostComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ScreenReaderState,
          useValue: { on: screenReaderOn.asReadonly() },
        },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      A11Y: { CLOSE_DIALOG: 'Dialog schließen' },
    });
    translate.use('de');
    fixture = TestBed.createComponent(SheetHostComponent);
    fixture.detectChanges();
  });

  function button(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(
      'app-sheet-close-button ion-button',
    );
  }

  it('is a button named after what it does while a screen reader is on', () => {
    expect(button().textContent.trim()).toBe('Dialog schließen');
  });

  it('is left out without a screen reader, who can swipe the sheet away', () => {
    screenReaderOn.set(false);
    fixture.detectChanges();

    expect(button()).toBeNull();
  });

  it('appears once the screen reader is switched on', () => {
    screenReaderOn.set(false);
    fixture.detectChanges();
    screenReaderOn.set(true);
    fixture.detectChanges();

    expect(button()).not.toBeNull();
  });

  it('closes the sheet it sits in without data, like a tap beside it', () => {
    const modal = (fixture.nativeElement as HTMLElement).querySelector(
      'ion-modal',
    );
    const dismiss = jasmine
      .createSpy('dismiss')
      .and.returnValue(Promise.resolve(true));
    Object.assign(modal, { dismiss });

    button().click();

    expect(dismiss).toHaveBeenCalledOnceWith(undefined, 'cancel');
  });
});
