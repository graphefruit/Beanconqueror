import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AlertController, ModalController, Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { Brew } from '../../../../classes/brew/brew';
import { BrewFlow } from '../../../../classes/brew/brewFlow';
import { ShareService } from '../../../../services/shareService/share-service.service';
import { UIAlert } from '../../../../services/uiAlert';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UIBrewHelper } from '../../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../../services/uiBrewStorage';
import { UIExcel } from '../../../../services/uiExcel';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIHelper } from '../../../../services/uiHelper';
import { UILog } from '../../../../services/uiLog';
import { UIMillHelper } from '../../../../services/uiMillHelper';
import { UIPreparationHelper } from '../../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { FlowCutSave } from '../../../../stores/brews/flow-cut-rules';
import { createMockUISettingsStorage } from '../../../../test-utils';
import { BrewDetailComponent } from '../brew-detail.component';

const PATH = 'brews/abc_flow_profile.json';
const BEFORE_CUT = 'brews/abc_flow_profile.before-cut.json';

/** Cutting the flow profile from the brew details. */
describe('BrewDetailComponent cut flow profile', () => {
  let component: BrewDetailComponent;
  let readFile: jasmine.Spy;
  let replaceFile: jasmine.Spy;
  let restoreFile: jasmine.Spy;
  let update: jasmine.Spy;
  let showMessage: jasmine.Spy;
  let createModal: jasmine.Spy;
  let platforms: string[];
  let cut: FlowCutSave;

  const click = {
    stopPropagation: () => undefined,
    stopImmediatePropagation: () => undefined,
  } as unknown as Event;

  beforeEach(() => {
    platforms = ['capacitor', 'android'];
    readFile = jasmine.createSpy('readInternalJSONFile');
    readFile.and.resolveTo(new BrewFlow());
    replaceFile = jasmine.createSpy('replaceInternalFileKeepingCopy');
    replaceFile.and.resolveTo();
    restoreFile = jasmine.createSpy('restoreInternalFileCopy');
    restoreFile.and.resolveTo();
    update = jasmine.createSpy('update');
    update.and.resolveTo(true);
    showMessage = jasmine.createSpy('showMessage');
    showMessage.and.resolveTo();

    const cutProfile = new BrewFlow();
    cutProfile.pressureFlow = [
      {
        brew_time: '0.0',
        timestamp: '00:00:00.000',
        actual_pressure: 9,
        old_pressure: 0,
      },
    ];
    cut = {
      flowProfile: cutProfile,
      brew_time: 20,
      brew_time_milliseconds: 20000,
      finalWeight: 36,
      coffee_first_drip_time: 2,
      coffee_first_drip_time_milliseconds: 0,
      coffee_blooming_time: 0,
      coffee_blooming_time_milliseconds: 0,
    };
    createModal = jasmine.createSpy('create');
    createModal.and.callFake(() =>
      Promise.resolve({
        present: () => Promise.resolve(),
        onWillDismiss: () => Promise.resolve({ role: 'save', data: cut }),
      }),
    );

    const settings = createMockUISettingsStorage();
    settings.attachOnEvent.and.returnValue(new Subject());
    TestBed.configureTestingModule({
      providers: [
        BrewDetailComponent,
        { provide: ModalController, useValue: { create: createModal } },
        { provide: UISettingsStorage, useValue: settings },
        {
          provide: UIPreparationStorage,
          useValue: { attachOnEvent: () => new Subject() },
        },
        {
          provide: UIFileHelper,
          useValue: {
            readInternalJSONFile: readFile,
            replaceInternalFileKeepingCopy: replaceFile,
            restoreInternalFileCopy: restoreFile,
          },
        },
        { provide: UIBrewStorage, useValue: { update } },
        { provide: UIAlert, useValue: { showMessage } },
        {
          provide: Platform,
          useValue: { is: (_name: string) => platforms.includes(_name) },
        },
        { provide: UILog, useValue: jasmine.createSpyObj('UILog', ['error']) },
        {
          provide: ChangeDetectorRef,
          useValue: jasmine.createSpyObj('ChangeDetectorRef', [
            'detectChanges',
          ]),
        },
        { provide: UIHelper, useValue: {} },
        { provide: UIBrewHelper, useValue: {} },
        { provide: UIAnalytics, useValue: {} },
        { provide: UIExcel, useValue: {} },
        { provide: UIBeanHelper, useValue: {} },
        { provide: UIPreparationHelper, useValue: {} },
        { provide: UIMillHelper, useValue: {} },
        { provide: TranslateService, useValue: {} },
        { provide: AlertController, useValue: {} },
        { provide: ShareService, useValue: {} },
      ],
    });
    component = TestBed.inject(BrewDetailComponent);
    spyOn(
      component as unknown as { initializeFlowChartOnGraphEl: () => void },
      'initializeFlowChartOnGraphEl',
    ).and.resolveTo();

    const brew = new Brew();
    brew.config.uuid = 'abc';
    brew.flow_profile = PATH;
    brew.brew_time = 30;
    brew.brew_beverage_quantity = 40;
    component.data = brew;
    component.brew = new Brew();
    Object.assign(component.brew, brew);
  });

  it('writes the cut profile, keeps the one from before and saves the brew', async () => {
    await component.cutFlowProfile(click);

    expect(replaceFile).toHaveBeenCalledOnceWith(
      JSON.stringify(cut.flowProfile),
      PATH,
      BEFORE_CUT,
    );
    const saved = update.calls.mostRecent().args[0] as Brew;
    expect(saved.brew_time).toBe(20);
    expect(saved.brew_beverage_quantity).toBe(36);
    expect(component.data).toBe(saved);
    expect(component.brew.brew_time).toBe(20);
    expect(component.brew.coffee_first_drip_time).toBe(2);
    expect(showMessage).not.toHaveBeenCalled();
  });

  it('changes nothing of the brew and says so when the file cannot be written', async () => {
    replaceFile.and.rejectWith(new Error('disk full'));
    const before = component.data;

    await component.cutFlowProfile(click);

    expect(update).not.toHaveBeenCalled();
    expect(component.data).toBe(before);
    expect(component.data.brew_time).toBe(30);
    expect(component.data.brew_beverage_quantity).toBe(40);
    expect(component.brew.brew_time).toBe(30);
    expect(showMessage).toHaveBeenCalledOnceWith(
      'CUT_FLOW_PROFILE_SAVE_FAILED',
      'ERROR_OCCURED',
      undefined,
      true,
    );
  });

  it('puts the profile from before back when the brew cannot be saved', async () => {
    update.and.resolveTo(false);
    const before = component.data;

    await component.cutFlowProfile(click);

    expect(restoreFile).toHaveBeenCalledOnceWith(BEFORE_CUT, PATH);
    expect(component.data).toBe(before);
    expect(component.data.brew_time).toBe(30);
    expect(component.brew.brew_time).toBe(30);
    expect(showMessage).toHaveBeenCalledTimes(1);
  });

  it('still says so when the profile cannot be put back either', async () => {
    update.and.resolveTo(false);
    restoreFile.and.rejectWith(new Error('gone'));

    await component.cutFlowProfile(click);

    expect(showMessage).toHaveBeenCalledTimes(1);
    expect(component.data.brew_time).toBe(30);
  });

  it('saves only the brew in the browser, which shows a sample profile', async () => {
    platforms = ['desktop'];

    await component.cutFlowProfile(click);

    expect(readFile).not.toHaveBeenCalled();
    expect(replaceFile).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    expect(component.data.brew_time).toBe(20);
  });

  it('writes nothing when the cut is cancelled', async () => {
    createModal.and.callFake(() =>
      Promise.resolve({
        present: () => Promise.resolve(),
        onWillDismiss: () => Promise.resolve({ role: 'cancel' }),
      }),
    );

    await component.cutFlowProfile(click);

    expect(replaceFile).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
