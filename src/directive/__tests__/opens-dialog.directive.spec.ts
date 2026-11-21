import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { OpensDialogDirective } from '../opens-dialog.directive';

/**
 * A stand-in that, like Ionic, is defined only after Angular created it and
 * takes its aria attributes when it loads.
 */
class TestCheckbox extends HTMLElement {
  private loaded!: Promise<this>;

  public connectedCallback(): void {
    this.loaded = Promise.resolve().then(() => {
      this.removeAttribute('aria-haspopup');
      return this;
    });
  }

  public componentOnReady(): Promise<this> {
    return this.loaded;
  }
}

@Component({
  imports: [OpensDialogDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<test-opens-dialog-checkbox opensDialog aria-haspopup="dialog"
    >Analytics</test-opens-dialog-checkbox
  >`,
})
class HostComponent {}

describe('OpensDialogDirective', () => {
  it('says that the checkbox opens a dialog once it has loaded', async () => {
    TestBed.overrideDirective(OpensDialogDirective, {
      set: { selector: 'test-opens-dialog-checkbox[opensDialog]' },
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    customElements.define('test-opens-dialog-checkbox', TestCheckbox);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));

    const checkbox = (fixture.nativeElement as HTMLElement).querySelector(
      'test-opens-dialog-checkbox',
    );
    expect(checkbox.getAttribute('aria-haspopup')).toBe('dialog');
  });
});
