import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GraphInformationCardComponent } from './graph-information-card.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIHelperMock } from '../../classes/mock';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';
import { Graph } from '../../classes/graph/graph';

describe('GraphInformationCardComponent', () => {
  let component: GraphInformationCardComponent;
  let fixture: ComponentFixture<GraphInformationCardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GraphInformationCardComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Storage },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        { provide: FileChooser },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphInformationCardComponent);
    component = fixture.componentInstance;
    component.graph = {
      name: '',
    } as Graph;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
