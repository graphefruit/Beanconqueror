import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Graph } from '../../classes/graph/graph';
import { Mill } from '../../classes/mill/mill';
import { Preparation } from '../../classes/preparation/preparation';
import { Settings } from '../../classes/settings/settings';
import { Water } from '../../classes/water/water';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UIGraphHelper } from '../../services/uiGraphHelper';
import { UIGraphStorage } from '../../services/uiGraphStorage.service';
import { UIHelper } from '../../services/uiHelper';
import { UIImage } from '../../services/uiImage';
import { UILog } from '../../services/uiLog';
import { UIMillHelper } from '../../services/uiMillHelper';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIPreparationHelper } from '../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIToast } from '../../services/uiToast';
import { UIWaterHelper } from '../../services/uiWaterHelper';
import { UIWaterStorage } from '../../services/uiWaterStorage';
import { BrewUsageStore } from '../../stores/brews/brew-usage.store';
import { DeleteCommands } from '../../stores/delete-commands';
import { GraphInformationCardComponent } from '../graph-information-card/graph-information-card.component';
import { MillInformationCardComponent } from '../mill-information-card/mill-information-card.component';
import { PreparationInformationCardComponent } from '../preparation-information-card/preparation-information-card.component';
import { WaterInformationCardComponent } from '../water-information-card/water-information-card.component';

/**
 * The options button of a list entry names the entry, so a screen reader
 * tells the buttons of a list apart. Beans and brews: their own tests.
 */
describe('the options button of a list entry', () => {
  const cards: [string, Type<unknown>, string, () => { name: string }][] = [
    [
      'preparation method',
      PreparationInformationCardComponent,
      'preparation',
      () => new Preparation(),
    ],
    ['grinder', MillInformationCardComponent, 'mill', () => new Mill()],
    ['water', WaterInformationCardComponent, 'water', () => new Water()],
    ['graph', GraphInformationCardComponent, 'graph', () => new Graph()],
  ];

  beforeEach(() => {
    const unused = [
      UIAlert,
      UIAnalytics,
      UIBrewHelper,
      UIFileHelper,
      UIGraphHelper,
      UIGraphStorage,
      UIImage,
      UILog,
      UIMillHelper,
      UIMillStorage,
      UIPreparationHelper,
      UIPreparationStorage,
      UIToast,
      UIWaterHelper,
      UIWaterStorage,
      DeleteCommands,
      ModalController,
      Platform,
    ].map((provide) => ({ provide, useValue: {} }));
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        ...unused,
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => new Settings() },
        },
        { provide: UIBrewStorage, useValue: { getAllEntries: () => [] } },
        { provide: UIBeanStorage, useValue: { getByUUID: () => undefined } },
        {
          provide: UIHelper,
          useValue: { toFixedIfNecessary: (value: number) => value },
        },
        {
          provide: BrewUsageStore,
          useValue: { byPreparation: () => new Map(), byMill: () => new Map() },
        },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      A11Y: { OPTIONS_FOR: 'Options for {{name}}' },
    });
    translate.use('en');
  });

  for (const [kind, component, input, create] of cards) {
    it(`names the ${kind}`, async () => {
      const entry = create();
      entry.name = 'Kitchen';
      const fixture = TestBed.createComponent(component);
      fixture.componentRef.setInput(input, entry);
      fixture.detectChanges();

      const button = (fixture.nativeElement as HTMLElement)
        .querySelector('ion-icon[name="beanconqueror-dots"]')
        .closest('ion-button');
      // Ionic moves the name of ion-button to the button in its shadow root.
      await new Promise((resolve) => setTimeout(resolve));
      expect(
        button.shadowRoot
          ?.querySelector('button')
          ?.getAttribute('aria-label') ?? button.getAttribute('aria-label'),
      ).toBe('Options for Kitchen');
      fixture.destroy();
    });
  }
});
