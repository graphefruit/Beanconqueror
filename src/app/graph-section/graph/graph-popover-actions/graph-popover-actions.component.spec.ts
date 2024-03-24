import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GraphPopoverActionsComponent } from './graph-popover-actions.component';
import {
  DefaultLangChangeEvent,
  LangChangeEvent,
  TranslatePipe,
  TranslateService,
  TranslationChangeEvent,
} from '@ngx-translate/core';
import { NEVER, Observable } from 'rxjs';
import { EventEmitter } from '@angular/core';

describe('GraphPopoverActionsComponent', () => {
  let component: GraphPopoverActionsComponent;
  let fixture: ComponentFixture<GraphPopoverActionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GraphPopoverActionsComponent, TranslatePipe],
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

    fixture = TestBed.createComponent(GraphPopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
