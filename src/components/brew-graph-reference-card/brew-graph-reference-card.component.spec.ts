import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewGraphReferenceCardComponent } from './brew-graph-reference-card.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIHelperMock } from '../../classes/mock';
import { Brew } from '../../classes/brew/brew';
import { IBrew } from '../../interfaces/brew/iBrew';
import { Bean } from '../../classes/bean/bean';
import { Preparation } from '../../classes/preparation/preparation';
import { Mill } from '../../classes/mill/mill';
import { PipesModule } from 'src/pipes/pipes.module';

describe('BrewGraphReferenceCardComponent', () => {
  let component: BrewGraphReferenceCardComponent;
  let fixture: ComponentFixture<BrewGraphReferenceCardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewGraphReferenceCardComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), PipesModule],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewGraphReferenceCardComponent);
    component = fixture.componentInstance;
    component.brew = {
      initializeByObject(brewObj: IBrew) {},
      config: {
        uuid: '',
      },
      getBean(): Bean {
        return new Bean();
      },
      getPreparation(): Preparation {
        return new Preparation();
      },
      getMill(): Mill {
        return new Mill();
      },
      getBrewRatio(): string {
        return '';
      },
    } as Brew;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
