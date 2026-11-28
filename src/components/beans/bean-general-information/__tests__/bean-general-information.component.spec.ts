import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { Platform } from '@ionic/angular';
import { defineCustomElement as defineInput } from '@ionic/core/components/ion-input.js';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Bean } from '../../../../classes/bean/bean';
import { Settings } from '../../../../classes/settings/settings';
import { BEAN_MIX_ENUM } from '../../../../enums/beans/mix';
import { IBeanInformation } from '../../../../interfaces/bean/iBeanInformation';
import { CoffeeBluetoothDevicesService } from '../../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { VALUE_PICKER_PORT } from '../../../../services/ports/value-picker-port';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../../services/uiBeanStorage';
import { UIHelper } from '../../../../services/uiHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import {
  createMockUIBeanHelper,
  createMockUISettingsStorage,
} from '../../../../test-utils';
import { FakeValuePickerPort } from '../../../../test-utils/fake-value-picker-port';
import { PhotoAddComponent } from '../../../photo-add/photo-add.component';
import { BeanGeneralInformationComponent } from '../bean-general-information.component';

describe('BeanGeneralInformationComponent', () => {
  let component: BeanGeneralInformationComponent;
  let fixture: ComponentFixture<BeanGeneralInformationComponent>;
  let settings: Settings;
  let valuePicker: FakeValuePickerPort;

  beforeEach(waitForAsync(() => {
    // Only the mix field is shown: the other fields play no part here.
    settings = new Settings();
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

    valuePicker = new FakeValuePickerPort();

    TestBed.configureTestingModule({
      imports: [BeanGeneralInformationComponent, TranslateModule.forRoot()],
      providers: [
        { provide: VALUE_PICKER_PORT, useValue: valuePicker },
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

  it('should suggest the roasters of the stored beans, leaving out beans without one', () => {
    setBean('SINGLE_ORIGIN' as BEAN_MIX_ENUM, ['']);
    const named = new Bean();
    named.roaster = 'Rösterei Nord';
    // Beans from old backups can lack the roaster altogether.
    const unnamed = Object.assign(new Bean(), { roaster: undefined });
    TestBed.inject(UIBeanStorage).getAllEntries = () => [named, unnamed];

    expect(component.storedRoasters()).toEqual(['Rösterei Nord']);
  });

  describe('the required name', () => {
    beforeAll(() => {
      defineInput();
    });

    beforeEach(() => {
      settings.bean_manage_parameters.name = true;
      TestBed.inject(TranslateService).setTranslation('en', {
        BEAN: {
          VALIDATION: {
            NAME_REQUIRED: 'Please enter a name for these beans.',
          },
        },
      });
      TestBed.inject(TranslateService).use('en');
    });

    /** Ionic marks the field in its next render. */
    async function rendered(): Promise<void> {
      fixture.detectChanges();
      await fixture.whenStable();
      for (let frame = 0; frame < 3; frame++) {
        await new Promise((next) => requestAnimationFrame(next));
      }
    }

    it('is marked as an error with its reason once it is left empty, and no longer once filled', async () => {
      setBean('SINGLE_ORIGIN' as BEAN_MIX_ENUM, ['']);
      const field = (
        fixture.nativeElement as HTMLElement
      ).querySelector<HTMLIonInputElement>('ion-input[name="name"]');
      const native = await field.getInputElement();
      await rendered();

      expect(native.required).toBeTrue();
      expect(native.hasAttribute('aria-invalid')).toBeFalse();

      native.dispatchEvent(new FocusEvent('focus'));
      native.dispatchEvent(new FocusEvent('blur'));
      await rendered();

      expect(native.getAttribute('aria-invalid')).toBe('true');
      const description = native
        .getAttribute('aria-describedby')
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent.trim())
        .filter(Boolean);
      expect(description).toEqual(['Please enter a name for these beans.']);

      native.value = 'Ethiopia Guji';
      native.dispatchEvent(new InputEvent('input'));
      native.dispatchEvent(new FocusEvent('blur'));
      await rendered();

      expect(component.data.name).toBe('Ethiopia Guji');
      expect(native.hasAttribute('aria-invalid')).toBeFalse();
    });
  });

  describe('choosing a date on a device', () => {
    const CHOSEN = new Date('2026-11-20T00:00:00.000Z');
    const click = (): Event => {
      const event = new Event('click');
      Object.defineProperty(event, 'target', {
        value: document.createElement('input'),
      });
      return event;
    };

    beforeEach(() => {
      spyOn(TestBed.inject(Platform), 'is').and.returnValue(true);
      setBean('SINGLE_ORIGIN' as BEAN_MIX_ENUM, ['']);
      component.data.buyDate = '2026-01-01T00:00:00.000Z';
    });

    it('opens the picker on today and stores the chosen date', async () => {
      valuePicker.answer = {
        ok: true,
        value: { kind: 'chosen', date: CHOSEN },
      };

      await component.chooseDate(click(), 'buyDate');

      expect(component.data.buyDate).toBe('2026-11-20T00:00:00.000Z');
      expect(valuePicker.starts.length).toBe(1);
      expect(
        Math.abs(valuePicker.starts[0].getTime() - Date.now()),
      ).toBeLessThan(60_000);
    });

    it('empties the field once the date is cleared', async () => {
      valuePicker.answer = { ok: true, value: { kind: 'cleared' } };

      await component.chooseDate(click(), 'buyDate');

      expect(component.data.buyDate).toBe('');
    });

    for (const answer of [
      { ok: true, value: { kind: 'cancelled' } },
      { ok: false, error: 'Activity destroyed' },
    ] as const) {
      it(`keeps the date when the pick is ${answer.ok ? 'cancelled' : 'failed'}`, async () => {
        valuePicker.answer = answer;

        await component.chooseDate(click(), 'buyDate');

        expect(component.data.buyDate).toBe('2026-01-01T00:00:00.000Z');
      });
    }
  });
});
