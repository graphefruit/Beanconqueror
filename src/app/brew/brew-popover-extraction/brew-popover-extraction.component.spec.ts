import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewPopoverExtractionComponent } from './brew-popover-extraction.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Brew } from '../../../classes/brew/brew';
import { Preparation } from '../../../classes/preparation/preparation';
import { TranslateServiceMock } from '../../../classes/mock';

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
          useValue: TranslateServiceMock,
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
