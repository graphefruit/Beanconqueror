import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';

import { Bean } from '../../../../../classes/bean/bean';
import { GreenBean } from '../../../../../classes/green-bean/green-bean';
import { Settings } from '../../../../../classes/settings/settings';
import { BEAN_MIX_ENUM } from '../../../../../enums/beans/mix';
import { IBean } from '../../../../../interfaces/bean/iBean';
import { IBeanInformation } from '../../../../../interfaces/bean/iBeanInformation';
import { UISettingsStorage } from '../../../../../services/uiSettingsStorage';
import { ingestBean } from '../../../../../stores/beans/bean.store';
import {
  BeanDetailSortInformationComponent,
  BeanVarieties,
} from '../bean-detail-sort-information.component';

describe('BeanDetailSortInformationComponent', () => {
  let settings: Settings;

  beforeEach(() => {
    settings = new Settings();
    TestBed.configureTestingModule({
      imports: [BeanDetailSortInformationComponent, TranslateModule.forRoot()],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings },
        },
      ],
    });
  });

  async function show(
    data: BeanVarieties,
  ): Promise<ComponentFixture<BeanDetailSortInformationComponent>> {
    const fixture = TestBed.createComponent(BeanDetailSortInformationComponent);
    fixture.componentRef.setInput('data', data);
    await fixture.whenStable();
    return fixture;
  }

  function text(
    fixture: ComponentFixture<BeanDetailSortInformationComponent>,
  ): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  /** A stored bean with one variety at 60 %, as the store hands it out. */
  function storedBean(beanMix: BEAN_MIX_ENUM): IBean {
    const bean = new Bean();
    bean.beanMix = beanMix;
    bean.bean_information = [{ percentage: 60 } as IBeanInformation];
    return ingestBean(JSON.stringify(bean));
  }

  describe('percentage field visibility', () => {
    it('should show percentage field when bean is BLEND and percentage setting is enabled', async () => {
      settings.bean_manage_parameters.percentage = true;
      const fixture = await show(storedBean('BLEND' as BEAN_MIX_ENUM));

      expect(text(fixture)).toContain('BEAN_DATA_PERCENTAGE');
      expect(text(fixture)).toContain('1. BEAN_SORT');
    });

    it('should hide percentage field when bean is SINGLE_ORIGIN', async () => {
      settings.bean_manage_parameters.percentage = true;
      const fixture = await show(storedBean('SINGLE_ORIGIN' as BEAN_MIX_ENUM));

      expect(text(fixture)).not.toContain('BEAN_DATA_PERCENTAGE');
      expect(text(fixture)).toContain('BEAN_SORT_INFORMATION');
    });

    it('should hide percentage field when bean is BLEND but percentage setting is disabled', async () => {
      settings.bean_manage_parameters.percentage = false;
      const fixture = await show(storedBean('BLEND' as BEAN_MIX_ENUM));

      expect(text(fixture)).not.toContain('BEAN_DATA_PERCENTAGE');
    });

    it('should hide percentage field for GreenBean regardless of settings', async () => {
      settings.bean_manage_parameters.percentage = true;
      const greenBean = new GreenBean();
      greenBean.bean_information = [{ percentage: 60 } as IBeanInformation];
      const fixture = await show(greenBean);

      expect(text(fixture)).not.toContain('BEAN_DATA_PERCENTAGE');
      expect(text(fixture)).toContain('BEAN_SORT_INFORMATION');
    });
  });

  it('shows only the fields switched on in the bean parameters', async () => {
    settings.bean_manage_parameters.country = true;
    settings.bean_manage_parameters.region = false;
    const fixture = await show(storedBean('SINGLE_ORIGIN' as BEAN_MIX_ENUM));

    expect(text(fixture)).toContain('BEAN_DATA_COUNTRY');
    expect(text(fixture)).not.toContain('BEAN_DATA_REGION');
  });
});
