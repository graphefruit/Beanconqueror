import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { Bean } from '../../../../classes/bean/bean';
import { Settings } from '../../../../classes/settings/settings';
import { UIHelper } from '../../../../services/uiHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { UIToast } from '../../../../services/uiToast';
import { BeanCommands } from '../../../../stores/beans/bean-commands';
import { BeanArchivePopoverComponent } from '../bean-archive-popover.component';

describe('BeanArchivePopoverComponent', () => {
  let steps: string[];
  let archive: jasmine.Spy;

  beforeEach(() => {
    steps = [];
    archive = jasmine.createSpy('archive').and.callFake(() => {
      steps.push('archive');
      return Promise.resolve(true);
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: BeanCommands, useValue: { archive } },
        {
          provide: UIToast,
          useValue: {
            showInfoToast: (key: string) => steps.push(`toast ${key}`),
          },
        },
        {
          provide: ModalController,
          useValue: { dismiss: () => steps.push('dismiss') },
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => new Settings() },
        },
        { provide: UIHelper, useValue: {} },
      ],
    });
  });

  it('archives the bean with the rating and note given, then confirms and closes', async () => {
    const popover = TestBed.runInInjectionContext(
      () => new BeanArchivePopoverComponent(),
    );
    const bean = new Bean();
    bean.config.uuid = 'alpha';
    popover.data.initializeByObject(bean);
    popover.data.rating = 3;
    popover.data.note = 'last cup';

    await popover.archive();

    expect(archive).toHaveBeenCalledOnceWith('alpha', 3, 'last cup');
    expect(steps).toEqual([
      'archive',
      'toast TOAST_BEAN_ARCHIVED_SUCCESSFULLY',
      'dismiss',
    ]);
  });
});
