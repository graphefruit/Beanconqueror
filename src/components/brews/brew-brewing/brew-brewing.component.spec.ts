import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewBrewingComponent } from './brew-brewing.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { BrewMock, UIHelperMock } from '../../../classes/mock';
import { UIHelper } from '../../../services/uiHelper';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
import { ScreenOrientation } from '@awesome-cordova-plugins/screen-orientation/ngx';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Brew } from '../../../classes/brew/brew';
import { Preparation } from '../../../classes/preparation/preparation';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph/brew-brewing-graph.component';
import { FormsModule } from '@angular/forms';
import { KeysPipe } from 'src/pipes/keys';
import { BrewBrewingPreparationDeviceComponent } from '../brew-brewing-preparation-device/brew-brewing-preparation-device.component';

describe('BrewBrewingComponent', () => {
  let component: BrewBrewingComponent;
  let fixture: ComponentFixture<BrewBrewingComponent>;
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      // TODO: Decouple from other BrewBrewing components
      declarations: [
        BrewBrewingComponent,
        BrewBrewingGraphComponent,
        BrewBrewingPreparationDeviceComponent,
        KeysPipe,
      ],
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        HttpClientTestingModule,
        FormsModule,
      ],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: File },
        { provide: SocialSharing },
        { provide: FileTransfer },
        { provide: ScreenOrientation },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewBrewingComponent);
    component = fixture.componentInstance;
    component.brewBrewingGraphEl = TestBed.createComponent(
      BrewBrewingGraphComponent
    ).componentInstance;
    component.brewBrewingPreparationDeviceEl = TestBed.createComponent(
      BrewBrewingPreparationDeviceComponent
    ).componentInstance;

    let brewMock = new BrewMock();
    component.data = brewMock;
    component.brewBrewingGraphEl.data = brewMock;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
