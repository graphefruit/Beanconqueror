import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular';

import { TranslateModule } from '@ngx-translate/core';

import { Bean } from '../../../../classes/bean/bean';
import { Settings } from '../../../../classes/settings/settings';
import { VALUE_PICKER_PORT } from '../../../../services/ports/value-picker-port';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import {
  createMockUIBeanHelper,
  createMockUISettingsStorage,
} from '../../../../test-utils';
import { FakeValuePickerPort } from '../../../../test-utils/fake-value-picker-port';
import { BeanFreezeInformationComponent } from '../bean-freeze-information.component';

describe('BeanFreezeInformationComponent', () => {
  const STORED = '2026-01-01T00:00:00.000Z';
  const CHOSEN = new Date('2026-11-20T00:00:00.000Z');
  let component: BeanFreezeInformationComponent;
  let fixture: ComponentFixture<BeanFreezeInformationComponent>;
  let valuePicker: FakeValuePickerPort;

  const click = (): Event => {
    const event = new Event('click');
    Object.defineProperty(event, 'target', {
      value: document.createElement('input'),
    });
    return event;
  };

  beforeEach(async () => {
    valuePicker = new FakeValuePickerPort();
    const settings = createMockUISettingsStorage();
    settings.getSettings.and.returnValue(new Settings());

    await TestBed.configureTestingModule({
      imports: [BeanFreezeInformationComponent, TranslateModule.forRoot()],
      providers: [
        { provide: UISettingsStorage, useValue: settings },
        { provide: UIBeanHelper, useValue: createMockUIBeanHelper() },
        { provide: VALUE_PICKER_PORT, useValue: valuePicker },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    spyOn(TestBed.inject(Platform), 'is').and.returnValue(true);
    fixture = TestBed.createComponent(BeanFreezeInformationComponent);
    component = fixture.componentInstance;
    component.data = new Bean();
    component.data.frozenDate = STORED;
    component.data.unfrozenDate = STORED;
    fixture.detectChanges();
  });

  it('stores the chosen freezing date', async () => {
    valuePicker.answer = { ok: true, value: { kind: 'chosen', date: CHOSEN } };

    await component.chooseDate(click(), 'freeze');

    expect(component.data.frozenDate).toBe('2026-11-20T00:00:00.000Z');
    expect(component.data.unfrozenDate).toBe(STORED);
  });

  it('empties the thawing date once it is cleared', async () => {
    valuePicker.answer = { ok: true, value: { kind: 'cleared' } };

    await component.chooseDate(click(), 'unfreeze');

    expect(component.data.unfrozenDate).toBe('');
    expect(component.data.frozenDate).toBe(STORED);
  });

  it('keeps both dates when the pick is cancelled', async () => {
    await component.chooseDate(click(), 'freeze');

    expect(component.data.frozenDate).toBe(STORED);
    expect(valuePicker.starts.length).toBe(1);
  });
});
