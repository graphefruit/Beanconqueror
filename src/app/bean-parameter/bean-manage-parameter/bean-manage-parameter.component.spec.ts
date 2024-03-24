import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanManageParameterComponent } from './bean-manage-parameter.component';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import {
  DefaultLangChangeEvent,
  LangChangeEvent,
  TranslatePipe,
  TranslateService,
  TranslationChangeEvent,
} from '@ngx-translate/core';
import { NEVER, Observable } from 'rxjs';
import { EventEmitter } from '@angular/core';
import { BeanListViewParameter } from '../../../classes/parameter/beanListViewParameter';

describe('BeanManageParameterComponent', () => {
  let component: BeanManageParameterComponent;
  let fixture: ComponentFixture<BeanManageParameterComponent>;

  beforeEach(waitForAsync(() => {
    const settingsMock = {
      bean_manage_parameters: {
        name: true,
      },
    } as Settings;

    TestBed.configureTestingModule({
      declarations: [BeanManageParameterComponent, TranslatePipe],
      imports: [IonicModule.forRoot()],
      providers: [
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings: (): Settings => {
              return settingsMock;
            },
          },
        },
        {
          provide: TranslateService,
          useValue: {
            instant: (
              _key: string | Array<string>,
              _interpolateParams?: any
            ) => {
              return 'hello';
            },
            get(
              _key: string | Array<string>,
              _interpolateParams?: any
            ): Observable<any> {
              return NEVER;
            },
            get onTranslationChange(): EventEmitter<TranslationChangeEvent> {
              return new EventEmitter();
            },
            get onLangChange(): EventEmitter<LangChangeEvent> {
              return new EventEmitter<LangChangeEvent>();
            },
            get onDefaultLangChange(): EventEmitter<DefaultLangChangeEvent> {
              return new EventEmitter();
            },
          } as TranslateService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BeanManageParameterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
