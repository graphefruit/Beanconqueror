import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import en from '../../../../assets/i18n/en.json';
import { BREW_SORT_AFTER } from '../../../../enums/brews/brewSortAfter';
import { BREW_SORT_ORDER } from '../../../../enums/brews/brewSortOrder';
import { UIHelper } from '../../../../services/uiHelper';
import { BrewSortComponent } from '../brew-sort.component';

describe('BrewSortComponent', () => {
  it('hands back the order chosen by tapping it and applying', () => {
    const dismiss = jasmine.createSpy('dismiss');
    TestBed.configureTestingModule({
      imports: [BrewSortComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ModalController, useValue: { dismiss } },
        {
          provide: UIHelper,
          useValue: { copyData: (value: object) => ({ ...value }) },
        },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en);
    translate.use('en');
    const fixture = TestBed.createComponent(BrewSortComponent);
    fixture.componentInstance.brew_sort = {
      sort_after: BREW_SORT_AFTER.BREW_DATE,
      sort_order: BREW_SORT_ORDER.DESCENDING,
    };
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    [...element.querySelectorAll<HTMLElement>('ion-item')]
      .find((item) => item.textContent.trim() === 'Bean name')
      .click();
    [...element.querySelectorAll<HTMLElement>('ion-button')]
      .find((button) => button.textContent.trim() === 'Apply filter')
      .click();

    expect(dismiss).toHaveBeenCalledOnceWith(
      {
        brew_sort: {
          sort_after: BREW_SORT_AFTER.BEAN_NAME,
          sort_order: BREW_SORT_ORDER.DESCENDING,
        },
      },
      undefined,
      BrewSortComponent.COMPONENT_ID,
    );
  });
});
