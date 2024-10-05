import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewBrewingComponent } from './brew-brewing.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { BrewMock, UIHelperMock } from '../../../classes/mock';
import { UIHelper } from '../../../services/uiHelper';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph/brew-brewing-graph.component';
import { FormsModule } from '@angular/forms';
import { BrewBrewingPreparationDeviceComponent } from '../brew-brewing-preparation-device/brew-brewing-preparation-device.component';
import { PipesModule } from 'src/pipes/pipes.module';

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
      ],
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        HttpClientTestingModule,
        FormsModule,
        PipesModule,
      ],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
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
