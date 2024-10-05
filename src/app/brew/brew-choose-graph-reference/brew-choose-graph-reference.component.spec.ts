import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { BrewChooseGraphReferenceComponent } from './brew-choose-graph-reference.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';
import { IBrewPageFilter } from '../../../interfaces/brew/iBrewPageFilter';
import { Brew } from '../../../classes/brew/brew';

describe('BrewChooseGraphReferenceComponent', () => {
  let component: BrewChooseGraphReferenceComponent;
  let fixture: ComponentFixture<BrewChooseGraphReferenceComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewChooseGraphReferenceComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        {
          provide: Storage,
        },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        {
          provide: FileChooser,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewChooseGraphReferenceComponent);
    component = fixture.componentInstance;
    component.brew = new Brew();
    component.brews = new Array<Brew>();
    component.archivedBrewsFilter = {
      method_of_preparation: new Array<string>(),
    } as IBrewPageFilter;
    component.openBrewsFilter = {
      method_of_preparation: new Array<string>(),
    } as IBrewPageFilter;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
