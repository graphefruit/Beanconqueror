import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { UIAlert } from '../../services/uiAlert';
import { TooltipDirective } from '../tooltip.directive';

@Component({
  imports: [TooltipDirective],
  template: `
    <span tooltip="Help text" tooltipTopic="Bildqualität"></span>
    <span tooltip="Other text"></span>
  `,
})
class HostComponent {}

describe('TooltipDirective', () => {
  let uiAlert: jasmine.SpyObj<UIAlert>;
  let fixture: ComponentFixture<HostComponent>;
  let withTopic: HTMLElement;
  let withoutTopic: HTMLElement;

  beforeEach(async () => {
    uiAlert = jasmine.createSpyObj<UIAlert>('UIAlert', ['showMessage']);
    uiAlert.showMessage.and.resolveTo();
    TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [{ provide: UIAlert, useValue: uiAlert }],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      MORE_INFORMATION: 'Mehr Infos',
      A11Y: { MORE_INFORMATION_ABOUT: 'Mehr Infos: {{topic}}' },
    });
    translate.setTranslation('en', {
      MORE_INFORMATION: 'More information',
      A11Y: { MORE_INFORMATION_ABOUT: 'More information: {{topic}}' },
    });
    translate.use('de');
    fixture = TestBed.createComponent(HostComponent);
    await settle();
    [withTopic, withoutTopic] = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('span'),
    );
  });

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('is a button in the tab order, named after its topic', () => {
    expect(withTopic.getAttribute('role')).toBe('button');
    expect(withTopic.tabIndex).toBe(0);
    expect(withTopic.getAttribute('aria-label')).toBe(
      'Mehr Infos: Bildqualität',
    );
    expect(withoutTopic.getAttribute('aria-label')).toBe('Mehr Infos');
  });

  it('follows a change of the app language', async () => {
    TestBed.inject(TranslateService).use('en');
    await settle();

    expect(withTopic.getAttribute('aria-label')).toBe(
      'More information: Bildqualität',
    );
  });

  it('shows its text when tapped', () => {
    withTopic.click();

    expect(uiAlert.showMessage.calls.allArgs()).toEqual([['Help text']]);
  });

  for (const key of ['Enter', ' ']) {
    it(`shows its text on ${key === ' ' ? 'Space' : key}`, () => {
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      withTopic.dispatchEvent(event);

      expect(uiAlert.showMessage.calls.allArgs()).toEqual([['Help text']]);
      expect(event.defaultPrevented).toBeTrue();
    });
  }
});
