import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewGraphReferenceCardComponent } from './brew-graph-reference-card.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIHelperMock } from '../../classes/mock';
import { Brew } from '../../classes/brew/brew';
import { FormatDatePipe } from '../../pipes/formatDate';
import { IBrew } from '../../interfaces/brew/iBrew';
import { Bean } from '../../classes/bean/bean';
import { Preparation } from '../../classes/preparation/preparation';
import { Mill } from '../../classes/mill/mill';

describe('BrewGraphReferenceCardComponent', () => {
  let component: BrewGraphReferenceCardComponent;
  let fixture: ComponentFixture<BrewGraphReferenceCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BrewGraphReferenceCardComponent, FormatDatePipe],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();

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
