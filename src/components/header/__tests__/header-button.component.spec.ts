import { TestBed } from '@angular/core/testing';

import { HeaderButtonComponent } from '../header-button.component';

/**
 * Keyboards (Enter, Space) and screen readers (double tap with TalkBack)
 * activate a button with a click and nothing else.
 */
describe('HeaderButtonComponent', () => {
  for (const longPressEnabled of [false, true]) {
    it(`reports a click alone${longPressEnabled ? ' when it also takes a long press' : ''}`, () => {
      const fixture = TestBed.createComponent(HeaderButtonComponent);
      fixture.componentRef.setInput('icon', 'beanconqueror-add');
      fixture.componentRef.setInput('ariaLabel', 'Add brew');
      fixture.componentRef.setInput('longPressEnabled', longPressEnabled);
      fixture.detectChanges();
      const clicks: Event[] = [];
      fixture.componentInstance.clicked.subscribe((event) =>
        clicks.push(event),
      );

      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLElement>('ion-button')
        .click();

      expect(clicks.length).toBe(1);
    });
  }
});
