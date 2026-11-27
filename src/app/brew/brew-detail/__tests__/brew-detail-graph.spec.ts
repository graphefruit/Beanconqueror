import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AlertController, ModalController, Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import recorded from '../../../../assets/BeanconquerorFlowTestDataFourth.json';
import { Bean } from '../../../../classes/bean/bean';
import { Brew } from '../../../../classes/brew/brew';
import { BrewFlow } from '../../../../classes/brew/brewFlow';
import { Mill } from '../../../../classes/mill/mill';
import { Preparation } from '../../../../classes/preparation/preparation';
import { Visualizer } from '../../../../classes/visualizer/visualizer';
import { Water } from '../../../../classes/water/water';
import {
  FlowProfileReader,
  ReferenceFlow,
} from '../../../../components/brews/graph/flow-profile-reader.service';
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
import { createMockUISettingsStorage } from '../../../../test-utils';
import { BrewDetailComponent } from '../brew-detail.component';

const PATH = 'brews/abc_flow_profile.json';

/** A fresh copy of a recorded flow file, as reading the file gives one. */
function recordedFlow(): BrewFlow {
  return structuredClone(recorded) as unknown as BrewFlow;
}

/** The graph of the brew details: read once, shown, downloaded and maximized. */
describe('BrewDetailComponent graph', () => {
  let component: BrewDetailComponent;
  let read: jasmine.Spy;
  let readReference: jasmine.Spy;
  let exportBrewFlowProfile: jasmine.Spy;
  let exportJSON: jasmine.Spy;
  let detailBrewGraph: jasmine.Spy;
  let editBrew: jasmine.Spy;
  let repeatBrew: jasmine.Spy;
  let file: BrewFlow | null;
  let reference: ReferenceFlow;

  function shown(): {
    flow: BrewFlow | null | undefined;
    reference: BrewFlow | null;
    avg: number;
    peak: number;
  } {
    const view = component as unknown as Record<
      'flow' | 'reference' | 'avgFlow' | 'peakFlow',
      () => unknown
    >;
    return {
      flow: view.flow() as BrewFlow | null | undefined,
      reference: view.reference() as BrewFlow | null,
      avg: view.avgFlow() as number,
      peak: view.peakFlow() as number,
    };
  }

  function brew(flowProfile = PATH): Brew {
    const entry = new Brew();
    entry.config.uuid = 'abc';
    entry.flow_profile = flowProfile;
    return entry;
  }

  beforeEach(() => {
    file = recordedFlow();
    reference = { flow: null, missing: false };
    read = jasmine.createSpy('read').and.callFake(() => Promise.resolve(file));
    readReference = jasmine
      .createSpy('readReference')
      .and.callFake(() => Promise.resolve(reference));
    exportBrewFlowProfile = jasmine
      .createSpy('exportBrewFlowProfile')
      .and.resolveTo();
    exportJSON = jasmine.createSpy('exportJSON').and.resolveTo();
    detailBrewGraph = jasmine.createSpy('detailBrewGraph').and.resolveTo();
    editBrew = jasmine.createSpy('editBrew').and.resolveTo(undefined);
    repeatBrew = jasmine.createSpy('repeatBrew').and.resolveTo();
    spyOn(Brew.prototype, 'getBean').and.returnValue(new Bean());
    spyOn(Brew.prototype, 'getPreparation').and.returnValue(new Preparation());
    spyOn(Brew.prototype, 'getMill').and.returnValue(new Mill());
    spyOn(Brew.prototype, 'getWater').and.returnValue(new Water());

    const settings = createMockUISettingsStorage();
    settings.attachOnEvent.and.returnValue(new Subject());
    TestBed.configureTestingModule({
      providers: [
        BrewDetailComponent,
        { provide: FlowProfileReader, useValue: { read, readReference } },
        { provide: UIGraphHelper, useValue: { detailBrewGraph } },
        { provide: UIExcel, useValue: { exportBrewFlowProfile } },
        {
          provide: UIHelper,
          useValue: {
            exportJSON,
            copyData: (data: unknown) => structuredClone(data),
          },
        },
        {
          provide: UIBrewHelper,
          useValue: {
            editBrew,
            repeatBrew,
            showSectionAfterBrew: () => true,
            showSectionWhileBrew: () => true,
            showSectionBeforeBrew: () => true,
            showCupping: () => false,
          },
        },
        { provide: UIAnalytics, useValue: { trackEvent: () => undefined } },
        { provide: UISettingsStorage, useValue: settings },
        {
          provide: UIPreparationStorage,
          useValue: { attachOnEvent: () => new Subject() },
        },
        { provide: ModalController, useValue: {} },
        { provide: Platform, useValue: { is: () => true } },
        { provide: UILog, useValue: jasmine.createSpyObj('UILog', ['error']) },
        { provide: ChangeDetectorRef, useValue: {} },
        { provide: UIFileHelper, useValue: {} },
        { provide: UIBrewStorage, useValue: {} },
        { provide: UIAlert, useValue: {} },
        { provide: UIBeanHelper, useValue: {} },
        { provide: UIPreparationHelper, useValue: {} },
        { provide: UIMillHelper, useValue: {} },
        { provide: TranslateService, useValue: {} },
        { provide: AlertController, useValue: {} },
        { provide: ShareService, useValue: {} },
      ],
    });
    component = TestBed.inject(BrewDetailComponent);
    component.brew = brew();
  });

  it('reads the graph and its reference once and shows them', async () => {
    const referenceFlow = new BrewFlow();
    reference = { flow: referenceFlow, missing: false };

    const entered = component.ionViewDidEnter();
    // The details show at once; the graph follows once its file is read.
    expect(component.loaded).toBeTrue();
    expect(shown().flow).toBeUndefined();
    await entered;

    expect(read).toHaveBeenCalledOnceWith(PATH);
    expect(readReference).toHaveBeenCalledOnceWith(component.data);
    expect(shown().flow).toBe(file);
    expect(shown().reference).toBe(referenceFlow);
  });

  it('shows the average and peak flow of the graph read', async () => {
    await component.ionViewDidEnter();

    expect(shown().avg).toBeCloseTo(averageOfPositive(file.waterFlow), 6);
    expect(shown().peak).toBe(
      Math.max(...file.realtimeFlow.map((entry) => entry.flow_value)),
    );
  });

  it('reads nothing for a brew without graph', async () => {
    component.brew = brew('');

    await component.ionViewDidEnter();

    expect(read).not.toHaveBeenCalled();
    expect(shown().flow).toBeNull();
    expect(shown().avg).toBe(0);
    expect(shown().peak).toBe(0);
  });

  it('downloads the file as read, the same as before the new graph', async () => {
    await component.ionViewDidEnter();
    const loaded = shown().flow;

    await component.downloadFlowProfile();
    await component.downloadVisualizerProfile();

    expect(exportBrewFlowProfile).toHaveBeenCalledOnceWith(loaded);
    expect(exportBrewFlowProfile.calls.mostRecent().args[0]).toEqual(
      recordedFlow(),
    );
    // What the export wrote before: the brew mapped, with the flow as read.
    const before = new Visualizer();
    before.mapBrew(component.data);
    before.mapBean(new Bean());
    before.mapWater(new Water());
    before.mapPreparation(new Preparation());
    before.mapMill(new Mill());
    before.brewFlow = recordedFlow();
    expect(exportJSON).toHaveBeenCalledOnceWith(
      'abc_visualizer.json',
      JSON.stringify(before),
      true,
    );
  });

  it('downloads an empty profile when the file cannot be read, as before', async () => {
    file = null;
    await component.ionViewDidEnter();

    await component.downloadFlowProfile();
    await component.downloadVisualizerProfile();

    expect(exportBrewFlowProfile).toHaveBeenCalledOnceWith(new BrewFlow());
    const written = JSON.parse(
      exportJSON.calls.mostRecent().args[1] as string,
    ) as Visualizer;
    expect(written.brewFlow).toEqual(
      JSON.parse(JSON.stringify(new BrewFlow())),
    );
  });

  it('shows and downloads the graph of the edited brew right after editing', async () => {
    await component.ionViewDidEnter();
    const edited = brew();
    edited.flow_profile = 'brews/abc_edited_flow_profile.json';
    const editedFile = new BrewFlow();
    editBrew.and.callFake(() => {
      file = editedFile;
      return Promise.resolve(edited);
    });

    await component.edit();
    await component.downloadFlowProfile();

    expect(component.data).toBe(edited);
    expect(read).toHaveBeenCalledWith(edited.flow_profile);
    expect(shown().flow).toBe(editedFile);
    expect(exportBrewFlowProfile).toHaveBeenCalledOnceWith(editedFile);
  });

  it('keeps the graph when editing is cancelled or the brew repeated', async () => {
    await component.ionViewDidEnter();
    const before = shown().flow;

    await component.edit();
    await component.repeat();

    expect(repeatBrew).toHaveBeenCalledOnceWith(component.data);
    expect(read).toHaveBeenCalledTimes(1);
    expect(shown().flow).toBe(before);
  });

  it('maximizes the graph into the large graph of the brew', async () => {
    await component.ionViewDidEnter();

    await component.maximizeFlowGraph();

    expect(detailBrewGraph).toHaveBeenCalledOnceWith(component.data);
  });
});

function averageOfPositive(entries: { value: number }[]): number {
  const positive = entries.map((e) => e.value).filter((v) => v > 0);
  return positive.reduce((sum, v) => sum + v, 0) / positive.length;
}
