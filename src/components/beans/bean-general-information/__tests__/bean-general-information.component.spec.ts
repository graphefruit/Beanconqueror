import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';

import { Bean } from '../../../../classes/bean/bean';
import { Settings } from '../../../../classes/settings/settings';
import { BEAN_MIX_ENUM } from '../../../../enums/beans/mix';
import { IBeanInformation } from '../../../../interfaces/bean/iBeanInformation';
import { CoffeeBluetoothDevicesService } from '../../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../../services/uiBeanStorage';
import { UIHelper } from '../../../../services/uiHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import {
  createMockUIBeanHelper,
  createMockUISettingsStorage,
} from '../../../../test-utils';
import { PhotoAddComponent } from '../../../photo-add/photo-add.component';
import { BeanGeneralInformationComponent } from '../bean-general-information.component';

describe('BeanGeneralInformationComponent', () => {
  let component: BeanGeneralInformationComponent;
  let fixture: ComponentFixture<BeanGeneralInformationComponent>;

  beforeEach(waitForAsync(() => {
    // Only the mix field is shown: the other fields play no part here.
    const settings = new Settings();
    for (const key of Object.keys(settings.bean_manage_parameters)) {
      if (typeof settings.bean_manage_parameters[key] === 'boolean') {
        settings.bean_manage_parameters[key] = false;
      }
    }
    settings.bean_manage_parameters.beanMix = true;
    const mockUISettingsStorage = createMockUISettingsStorage();
    mockUISettingsStorage.getSettings.and.returnValue(settings);

    const mockUIHelper = jasmine.createSpyObj('UIHelper', ['cloneData']);
    mockUIHelper.cloneData.and.callFake((value: unknown): unknown =>
      structuredClone(value),
    );

    TestBed.configureTestingModule({
      imports: [BeanGeneralInformationComponent, TranslateModule.forRoot()],
      providers: [
        { provide: UISettingsStorage, useValue: mockUISettingsStorage },
        { provide: UIBeanHelper, useValue: createMockUIBeanHelper() },
        {
          provide: UIBeanStorage,
          useValue: jasmine.createSpyObj('UIBeanStorage', ['getAllEntries']),
        },
        { provide: UIHelper, useValue: mockUIHelper },
        {
          provide: CoffeeBluetoothDevicesService,
          useValue: jasmine.createSpyObj('CoffeeBluetoothDevicesService', [
            'getScale',
            'getScaleWeight',
          ]),
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      // The photos of a bean need the file system and play no part here.
      .overrideComponent(BeanGeneralInformationComponent, {
        remove: { imports: [PhotoAddComponent] },
      })
      .compileComponents();
  }));

  function setBean(beanMix: BEAN_MIX_ENUM, countries: string[]): void {
    const bean = new Bean();
    bean.beanMix = beanMix;
    bean.bean_information = countries.map(
      (country) => ({ country }) as IBeanInformation,
    );
    fixture = TestBed.createComponent(BeanGeneralInformationComponent);
    component = fixture.componentInstance;
    component.data = bean;
    fixture.detectChanges();
  }

  /** Picks a mix and leaves the field the way ion-select reports it. */
  function leaveMixField(beanMix?: BEAN_MIX_ENUM): void {
    if (beanMix !== undefined) {
      component.data.beanMix = beanMix;
    }
    fixture.nativeElement
      .querySelector('ion-select[name="beanMix"]')
      .dispatchEvent(new CustomEvent('ionBlur'));
    fixture.detectChanges();
  }

  function countries(): string[] {
    return component.data.bean_information.map(
      (information) => information.country,
    );
  }

  describe('leaving the mix field', () => {
    it('should keep all varieties of a blend when the mix was not changed', () => {
      setBean('BLEND' as BEAN_MIX_ENUM, ['Ethiopia', 'Brazil']);

      leaveMixField();

      expect(countries()).toEqual(['Ethiopia', 'Brazil']);
    });

    it('should keep only the first variety when a blend becomes a single origin', () => {
      setBean('BLEND' as BEAN_MIX_ENUM, ['Ethiopia', 'Brazil']);

      leaveMixField('SINGLE_ORIGIN' as BEAN_MIX_ENUM);

      expect(countries()).toEqual(['Ethiopia']);
    });

    it('should keep only the first variety when a blend becomes unknown', () => {
      setBean('BLEND' as BEAN_MIX_ENUM, ['Ethiopia', 'Brazil']);

      leaveMixField('UNKNOWN' as BEAN_MIX_ENUM);

      expect(countries()).toEqual(['Ethiopia']);
    });

    it('should keep the varieties added after switching back to a blend', () => {
      setBean('BLEND' as BEAN_MIX_ENUM, ['Ethiopia', 'Brazil']);
      leaveMixField('SINGLE_ORIGIN' as BEAN_MIX_ENUM);

      leaveMixField('BLEND' as BEAN_MIX_ENUM);
      expect(countries()).toEqual(['Ethiopia']);

      component.data.bean_information.push({
        country: 'Kenya',
      } as IBeanInformation);
      leaveMixField();

      expect(countries()).toEqual(['Ethiopia', 'Kenya']);
    });

    it('should keep all varieties of a blend stored with the name of its mix', () => {
      setBean(BEAN_MIX_ENUM.BLEND, ['Ethiopia', 'Brazil']);

      leaveMixField();

      expect(countries()).toEqual(['Ethiopia', 'Brazil']);
    });
  });
});
