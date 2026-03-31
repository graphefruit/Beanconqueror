import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';

import { Bean } from '../../../../../classes/bean/bean';
import { GreenBean } from '../../../../../classes/green-bean/green-bean';
import { Settings } from '../../../../../classes/settings/settings';
import { BEAN_MIX_ENUM } from '../../../../../enums/beans/mix';
import { IBeanInformation } from '../../../../../interfaces/bean/iBeanInformation';
import { UIBeanHelper } from '../../../../../services/uiBeanHelper';
import { UISettingsStorage } from '../../../../../services/uiSettingsStorage';
import {
  createMockUIBeanHelper,
  createMockUISettingsStorage,
} from '../../../../../test-utils';
import { BeanDetailSortInformationComponent } from '../bean-detail-sort-information.component';

describe('BeanDetailSortInformationComponent', () => {
  let component: BeanDetailSortInformationComponent;
  let fixture: ComponentFixture<BeanDetailSortInformationComponent>;
  let settings: Settings;
  let mockUISettingsStorage: jasmine.SpyObj<any>;

  beforeEach(waitForAsync(() => {
    settings = new Settings();
    mockUISettingsStorage = createMockUISettingsStorage();
    mockUISettingsStorage.getSettings.and.returnValue(settings);

    TestBed.configureTestingModule({
      imports: [BeanDetailSortInformationComponent, TranslateModule.forRoot()],
      providers: [
        { provide: UISettingsStorage, useValue: mockUISettingsStorage },
        { provide: UIBeanHelper, useValue: createMockUIBeanHelper() },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BeanDetailSortInformationComponent);
    component = fixture.componentInstance;
  });

  function percentageFieldPresent(): boolean {
    return fixture.nativeElement.textContent.includes('BEAN_DATA_PERCENTAGE');
  }

  function setBeanData(beanMix: BEAN_MIX_ENUM): void {
    const bean = new Bean();
    bean.beanMix = beanMix;
    bean.bean_information = [{ percentage: 60 } as IBeanInformation];
    component.data = bean;
    fixture.detectChanges();
  }

  describe('percentage field visibility', () => {
    it('should show percentage field when bean is BLEND and percentage setting is enabled', () => {
      settings.bean_manage_parameters.percentage = true;
      setBeanData('BLEND' as BEAN_MIX_ENUM);

      expect(percentageFieldPresent()).toBeTrue();
    });

    it('should hide percentage field when bean is SINGLE_ORIGIN', () => {
      settings.bean_manage_parameters.percentage = true;
      setBeanData('SINGLE_ORIGIN' as BEAN_MIX_ENUM);

      expect(percentageFieldPresent()).toBeFalse();
    });

    it('should hide percentage field when bean is BLEND but percentage setting is disabled', () => {
      settings.bean_manage_parameters.percentage = false;
      setBeanData('BLEND' as BEAN_MIX_ENUM);

      expect(percentageFieldPresent()).toBeFalse();
    });

    it('should hide percentage field for GreenBean regardless of settings', () => {
      settings.bean_manage_parameters.percentage = true;
      const greenBean = new GreenBean();
      greenBean.bean_information = [{ percentage: 60 } as IBeanInformation];
      component.data = greenBean;
      fixture.detectChanges();

      expect(percentageFieldPresent()).toBeFalse();
    });
  });
});
