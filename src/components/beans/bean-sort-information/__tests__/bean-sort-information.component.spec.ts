import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';

import { Bean } from '../../../../classes/bean/bean';
import { Settings } from '../../../../classes/settings/settings';
import { BEAN_MIX_ENUM } from '../../../../enums/beans/mix';
import { IBeanInformation } from '../../../../interfaces/bean/iBeanInformation';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../../services/uiBeanStorage';
import { UIHelper } from '../../../../services/uiHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import {
  createMockUIBeanHelper,
  createMockUISettingsStorage,
} from '../../../../test-utils';
import { BeanSortInformationComponent } from '../bean-sort-information.component';

describe('BeanSortInformationComponent', () => {
  let component: BeanSortInformationComponent;
  let fixture: ComponentFixture<BeanSortInformationComponent>;
  let settings: Settings;
  let mockUISettingsStorage: jasmine.SpyObj<any>;

  beforeEach(waitForAsync(() => {
    settings = new Settings();
    mockUISettingsStorage = createMockUISettingsStorage();
    mockUISettingsStorage.getSettings.and.returnValue(settings);

    TestBed.configureTestingModule({
      imports: [BeanSortInformationComponent, TranslateModule.forRoot()],
      providers: [
        { provide: UISettingsStorage, useValue: mockUISettingsStorage },
        { provide: UIBeanHelper, useValue: createMockUIBeanHelper() },
        {
          provide: UIBeanStorage,
          useValue: jasmine.createSpyObj('UIBeanStorage', ['getAllEntries']),
        },
        {
          provide: UIHelper,
          useValue: jasmine.createSpyObj('UIHelper', ['cloneData']),
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BeanSortInformationComponent);
    component = fixture.componentInstance;
  });

  function percentageFieldPresent(): boolean {
    const inputs = fixture.nativeElement.querySelectorAll('ion-input');
    return Array.from(inputs).some(
      (input: any) => input.label === 'BEAN_DATA_PERCENTAGE',
    );
  }

  function setBean(beanMix: BEAN_MIX_ENUM): void {
    const bean = new Bean();
    bean.beanMix = beanMix;
    bean.bean_information = [{} as IBeanInformation];
    component.data = bean;
    fixture.detectChanges();
  }

  it('should create', () => {
    setBean('SINGLE_ORIGIN' as BEAN_MIX_ENUM);
    expect(component).toBeTruthy();
  });

  describe('percentage field visibility', () => {
    it('should show percentage field when bean is BLEND and percentage setting is enabled', () => {
      settings.bean_manage_parameters.percentage = true;
      setBean('BLEND' as BEAN_MIX_ENUM);

      expect(percentageFieldPresent()).toBeTrue();
    });

    it('should hide percentage field when bean is SINGLE_ORIGIN', () => {
      settings.bean_manage_parameters.percentage = true;
      setBean('SINGLE_ORIGIN' as BEAN_MIX_ENUM);

      expect(percentageFieldPresent()).toBeFalse();
    });

    it('should hide percentage field when bean is BLEND but percentage setting is disabled', () => {
      settings.bean_manage_parameters.percentage = false;
      setBean('BLEND' as BEAN_MIX_ENUM);

      expect(percentageFieldPresent()).toBeFalse();
    });
  });
});
