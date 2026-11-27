import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AlertController, ModalController, Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import type { BrewGraphViewComponent } from '../../../../components/brews/graph/brew-graph-view/brew-graph-view.component';
import { FlowProfileReader } from '../../../../components/brews/graph/flow-profile-reader.service';
import { ShareService } from '../../../../services/shareService/share-service.service';
import { UIAlert } from '../../../../services/uiAlert';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UIBrewHelper } from '../../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../../services/uiBrewStorage';
import { UIExcel } from '../../../../services/uiExcel';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIGraphHelper } from '../../../../services/uiGraphHelper';
import { UIHelper } from '../../../../services/uiHelper';
import { UILog } from '../../../../services/uiLog';
import { UIMillHelper } from '../../../../services/uiMillHelper';
import { UIPreparationHelper } from '../../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { BrewDetailComponent } from '../brew-detail.component';

const IMAGE = 'data:image/png;base64,AAEC';

/** Sharing the graph of a brew as an image from its details. */
describe('BrewDetailComponent sharing the graph', () => {
  let component: BrewDetailComponent;
  let exportImage: jasmine.Spy;
  let shareService: jasmine.SpyObj<Pick<ShareService, 'shareFile'>>;
  let uiAlert: jasmine.SpyObj<Pick<UIAlert, 'showMessage'>>;
  let uiLog: jasmine.SpyObj<Pick<UILog, 'error'>>;

  beforeEach(() => {
    exportImage = jasmine.createSpy('exportImage').and.resolveTo(IMAGE);
    shareService = jasmine.createSpyObj('ShareService', ['shareFile']);
    shareService.shareFile.and.resolveTo(true);
    uiAlert = jasmine.createSpyObj('UIAlert', ['showMessage']);
    uiAlert.showMessage.and.resolveTo();
    uiLog = jasmine.createSpyObj('UILog', ['error']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ShareService, useValue: shareService },
        { provide: UIAlert, useValue: uiAlert },
        { provide: UILog, useValue: uiLog },
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings: () => ({}),
            attachOnEvent: () => new Subject(),
          },
        },
        {
          provide: UIPreparationStorage,
          useValue: { attachOnEvent: () => new Subject() },
        },
        { provide: ChangeDetectorRef, useValue: {} },
        { provide: ModalController, useValue: {} },
        { provide: AlertController, useValue: {} },
        { provide: Platform, useValue: { is: () => true } },
        { provide: TranslateService, useValue: {} },
        { provide: UIHelper, useValue: {} },
        { provide: UIBrewHelper, useValue: {} },
        { provide: UIAnalytics, useValue: {} },
        { provide: UIExcel, useValue: {} },
        { provide: UIBeanHelper, useValue: {} },
        { provide: UIPreparationHelper, useValue: {} },
        { provide: UIMillHelper, useValue: {} },
        { provide: UIFileHelper, useValue: {} },
        { provide: UIBrewStorage, useValue: {} },
        { provide: FlowProfileReader, useValue: {} },
        { provide: UIGraphHelper, useValue: {} },
      ],
    });
    component = TestBed.runInInjectionContext(() => new BrewDetailComponent());
    showGraph({ exportImage } as unknown as BrewGraphViewComponent);
  });

  /** The graph the details show, or none. */
  function showGraph(view: BrewGraphViewComponent | undefined): void {
    Reflect.set(component, 'graphView', () => view);
  }

  it('shares the image of the shown graph once, on every platform', async () => {
    await component.shareFlowProfile();

    expect(exportImage).toHaveBeenCalledOnceWith();
    expect(shareService.shareFile).toHaveBeenCalledOnceWith('', IMAGE);
    expect(uiAlert.showMessage).not.toHaveBeenCalled();
  });

  it('says so and logs the cause when the image cannot be made', async () => {
    const failure = new Error('The graph is not drawn');
    exportImage.and.rejectWith(failure);

    await component.shareFlowProfile();

    expect(shareService.shareFile).not.toHaveBeenCalled();
    expect(uiLog.error).toHaveBeenCalledOnceWith(
      'Cant share profilechart',
      failure,
    );
    expect(uiAlert.showMessage).toHaveBeenCalledOnceWith(
      'SHARE_FLOW_PROFILE_FAILED',
      undefined,
      undefined,
      true,
    );
  });

  it('says so when the image cannot be written to share', async () => {
    shareService.shareFile.and.resolveTo(false);

    await component.shareFlowProfile();

    expect(uiAlert.showMessage).toHaveBeenCalledOnceWith(
      'SHARE_FLOW_PROFILE_FAILED',
      undefined,
      undefined,
      true,
    );
  });

  it('says so when there is no graph to share', async () => {
    showGraph(undefined);

    await component.shareFlowProfile();

    expect(shareService.shareFile).not.toHaveBeenCalled();
    expect(uiAlert.showMessage).toHaveBeenCalledTimes(1);
  });
});
