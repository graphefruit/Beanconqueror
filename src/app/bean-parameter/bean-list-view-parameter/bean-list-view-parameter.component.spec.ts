import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanListViewParameterComponent } from './bean-list-view-parameter.component';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import {
  DefaultLangChangeEvent,
  LangChangeEvent,
  TranslatePipe,
  TranslateService,
  TranslationChangeEvent,
} from '@ngx-translate/core';
import { NEVER, Observable } from 'rxjs';
import { EventEmitter } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { BeanListViewParameter } from '../../../classes/parameter/beanListViewParameter';

describe('BeanListViewParameterComponent', () => {
  let component: BeanListViewParameterComponent;
  let fixture: ComponentFixture<BeanListViewParameterComponent>;

  beforeEach(waitForAsync(() => {
    const settingsMock = {
      bean_visible_list_view_parameters: {
        name: true,
      } as unknown as BeanListViewParameter,
    } as unknown as Settings;

    TestBed.configureTestingModule({
      declarations: [BeanListViewParameterComponent, TranslatePipe],
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
    fixture = TestBed.createComponent(BeanListViewParameterComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
