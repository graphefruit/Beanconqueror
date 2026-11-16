import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';

import { UIAlert } from '../../services/uiAlert';
import { TooltipDirective } from '../tooltip.directive';

@Component({
  imports: [TooltipDirective],
  template: '<span tooltip="Help text"></span>',
})
class HostComponent {}

describe('TooltipDirective', () => {
  let uiAlert: jasmine.SpyObj<UIAlert>;
  let host: HTMLElement;

  beforeEach(() => {
    uiAlert = jasmine.createSpyObj<UIAlert>('UIAlert', ['showMessage']);
    TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [{ provide: UIAlert, useValue: uiAlert }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = (fixture.nativeElement as HTMLElement).querySelector('span');
  });

  it('names its host, which shows an icon only', () => {
    // Without loaded texts the key is returned.
    expect(host.getAttribute('aria-label')).toBe('MORE_INFORMATION');
  });

  it('shows its text when the host is tapped', () => {
    host.click();

    expect(uiAlert.showMessage.calls.allArgs()).toEqual([['Help text']]);
  });
});
