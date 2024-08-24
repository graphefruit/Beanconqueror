import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanArchivePopoverComponent } from './bean-archive-popover.component';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIToast } from '../../../services/uiToast';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { UIHelper } from '../../../services/uiHelper';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

describe('BeanArchivePopoverComponent', () => {
  let component: BeanArchivePopoverComponent;
  let fixture: ComponentFixture<BeanArchivePopoverComponent>;

  beforeEach(waitForAsync(() => {
    const settingsMock = {} as Settings;

    TestBed.configureTestingModule({
      declarations: [BeanArchivePopoverComponent],
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        TranslateModule.forChild(),
        FormsModule,
      ],
      providers: [
        {
          provide: UIBeanStorage,
          useValue: {},
        },
        {
          provide: UIToast,
          useValue: {},
        },
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings: (): Settings => {
              return settingsMock;
            },
          },
        },
        {
          provide: UIHelper,
          useValue: {
            toFixedIfNecessary: (_value, _dp): number => 0,
          } as UIHelper,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BeanArchivePopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
