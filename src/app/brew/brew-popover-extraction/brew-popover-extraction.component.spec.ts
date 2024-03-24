import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewPopoverExtractionComponent } from './brew-popover-extraction.component';
import {
  DefaultLangChangeEvent,
  LangChangeEvent,
  TranslatePipe,
  TranslateService,
  TranslationChangeEvent,
} from '@ngx-translate/core';
import { Brew } from '../../../classes/brew/brew';
import { Preparation } from '../../../classes/preparation/preparation';
import { NEVER, Observable } from 'rxjs';
import { EventEmitter } from '@angular/core';

describe('BrewPopoverExtractionComponent', () => {
  let component: BrewPopoverExtractionComponent;
  let fixture: ComponentFixture<BrewPopoverExtractionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewPopoverExtractionComponent, TranslatePipe],
      imports: [IonicModule.forRoot()],
      providers: [
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
    fixture = TestBed.createComponent(BrewPopoverExtractionComponent);
    component = fixture.componentInstance;
    component.brew = {
      getPreparation(): Preparation {
        return new Preparation();
      },
    } as unknown as Brew;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
