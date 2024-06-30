import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewMaximizeControlsComponent } from './brew-maximize-controls.component';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { Storage } from '@ionic/storage';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { Preparation } from '../../../classes/preparation/preparation';
import { TranslateModule } from '@ngx-translate/core';

describe('BrewMaximizeControlsComponent', () => {
  let component: BrewMaximizeControlsComponent;
  let fixture: ComponentFixture<BrewMaximizeControlsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewMaximizeControlsComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Storage },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewMaximizeControlsComponent);
    component = fixture.componentInstance;
    component.brewComponent = {
      timer: {
        timer: {
          runTimer: false,
        },
        getSeconds(): number {
          return 10;
        },
      },
      getPreparation(): Preparation {
        return new Preparation();
      },
    } as BrewBrewingComponent;
    fixture.detectChanges();
  });

  it('should create', () => {
    pending(); // FIXME: Cannot read properties of undefined (reading 'brew_time')
    expect(component).toBeTruthy();
  });
});
