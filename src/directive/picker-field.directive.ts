import { Directive } from '@angular/core';

/**
 * A read-only field that opens a picker for its value when tapped, e.g. a date
 * or a brew time. It stays a read-only text field, so its label and value are
 * read as they are, and says that it opens a dialog; ion-input hands that on
 * to its native field. Enter and Space open the picker as a tap does; the
 * field blurs itself on that tap and takes the focus back, so the keyboard
 * stays where it was.
 */
@Directive({
  selector: 'ion-input[pickerField]',
  host: {
    'aria-haspopup': 'dialog',
    '(keydown.enter)': 'open($event)',
    '(keydown.space)': 'open($event)',
  },
})
export class PickerFieldDirective {
  protected open(event: Event): void {
    event.preventDefault();
    const field = event.target as HTMLElement;
    if ((event as KeyboardEvent).repeat || field.localName !== 'input') {
      return;
    }
    field.click();
    field.focus({ preventScroll: true });
  }
}
