import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { SegmentLabelComponent } from '../segment-label.component';

describe('SegmentLabelComponent', () => {
  let fixture: ComponentFixture<SegmentLabelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SegmentLabelComponent, TranslateModule.forRoot()],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      A11Y: {
        COUNT_TOTAL: '{{total}} insgesamt',
        COUNT_SHOWN: '{{shown}} von {{total}} angezeigt',
      },
    });
    translate.use('de');
    fixture = TestBed.createComponent(SegmentLabelComponent);
  });

  function show(shown: number, total: number): { seen: string; heard: string } {
    fixture.componentRef.setInput('label', 'Eingefroren');
    fixture.componentRef.setInput('shown', shown);
    fixture.componentRef.setInput('total', total);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const seen = host.querySelector('[aria-hidden="true"]');
    const heard = host.querySelector('.visually-hidden');
    return {
      seen: seen.textContent.replace(/\s+/g, ' ').trim(),
      heard: heard.textContent.replace(/\s+/g, ' ').trim(),
    };
  }

  it('shows the number in brackets below the label and says it in words', () => {
    expect(show(4, 4)).toEqual({
      seen: 'Eingefroren( 4 )',
      heard: 'Eingefroren, 4 insgesamt',
    });
  });

  it('shows how many of all are left while a filter is set', () => {
    expect(show(2, 4)).toEqual({
      seen: 'Eingefroren( 2 / 4 )',
      heard: 'Eingefroren, 2 von 4 angezeigt',
    });
  });
});
