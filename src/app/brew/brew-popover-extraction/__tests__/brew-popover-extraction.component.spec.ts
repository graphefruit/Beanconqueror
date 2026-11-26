import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController, provideIonicAngular } from '@ionic/angular';

import { provideTranslateService, TranslateService } from '@ngx-translate/core';

import type { Brew } from '../../../../classes/brew/brew';
import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import { BrewPopoverExtractionComponent } from '../brew-popover-extraction.component';

function brew(style: PREPARATION_STYLE_TYPE, tds: number, yieldText: string) {
  return {
    tds,
    getExtractionYield: () => yieldText,
    getPreparation: () => ({ style_type: style }),
  } as unknown as Brew;
}

describe('BrewPopoverExtractionComponent', () => {
  let fixture: ComponentFixture<BrewPopoverExtractionComponent>;
  let dismiss: jasmine.Spy;

  async function open(value: Brew): Promise<HTMLElement> {
    fixture = TestBed.createComponent(BrewPopoverExtractionComponent);
    fixture.componentRef.setInput('brew', value);
    const element = fixture.nativeElement as HTMLElement;
    element.style.cssText =
      'display: flex; flex-direction: column; height: 700px; width: 400px';
    document.body.appendChild(element);
    fixture.autoDetectChanges();
    // Lets the chart box be measured and the chart drawn.
    for (let i = 0; i < 4; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await fixture.whenStable();
    }
    return element;
  }

  beforeEach(() => {
    dismiss = jasmine.createSpy('dismiss').and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        provideTranslateService(),
        { provide: ModalController, useValue: { dismiss } },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      A11Y: {
        EXTRACTION_GRAPH:
          'Extraction chart: TDS {{tds}} %, extraction yield {{yield}} %',
      },
      EXTRACTION_CHART_LABEL_STRONG: 'STRONG<br>',
      EXTRACTION_CHART_LABEL_IDEAL: 'IDEAL',
      BREW_DATA_TDS: 'Total dissolved solids %',
    });
    translate.use('en');
  });

  afterEach(() => {
    fixture.nativeElement.remove();
    fixture.destroy();
  });

  it('draws the filter chart as an image named after the brew', async () => {
    const element = await open(
      brew(PREPARATION_STYLE_TYPE.POUR_OVER, 1.35, '22.5'),
    );

    const chart = element.querySelector('svg[role="img"]');
    expect(chart.getAttribute('aria-label')).toBe(
      'Extraction chart: TDS 1.35 %, extraction yield 22.5 %',
    );
    expect(element.querySelectorAll('.zone').length).toBe(9);
    // Screen readers get the name only, not every tick and zone name.
    expect(chart.querySelector(':scope > g').getAttribute('aria-hidden')).toBe(
      'true',
    );
    const strong = Array.from(element.querySelectorAll('.zone tspan')).map(
      (line) => line.textContent,
    );
    expect(strong).toContain('STRONG');
    expect(strong).toContain('IDEAL');
    expect(element.querySelectorAll('.point').length).toBe(1);
    expect(element.querySelector('.ideal')).not.toBeNull();
    expect(element.textContent).toContain('Total dissolved solids %');
    expect(element.textContent).toContain('1.8');
  });

  it('draws the espresso chart without zone names', async () => {
    const element = await open(brew(PREPARATION_STYLE_TYPE.ESPRESSO, 9, '20'));

    expect(element.querySelectorAll('.zone').length).toBe(0);
    expect(element.querySelectorAll('.point').length).toBe(1);
    expect(element.textContent).toContain('16');
  });

  it('closes with its id', async () => {
    await open(brew(PREPARATION_STYLE_TYPE.POUR_OVER, 1.35, '22.5'));

    fixture.componentInstance.dismiss();

    expect(dismiss).toHaveBeenCalledWith(
      { dismissed: true },
      undefined,
      BrewPopoverExtractionComponent.COMPONENT_ID,
    );
  });
});
