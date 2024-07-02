import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewFlavorPickerComponent } from './brew-flavor-picker.component';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { TranslateModule } from '@ngx-translate/core';
import { CuppingFlavorsComponent } from '../../../components/cupping-flavors/cupping-flavors.component';

describe('BrewFlavorPickerComponent', () => {
  let component: BrewFlavorPickerComponent;
  let fixture: ComponentFixture<BrewFlavorPickerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewFlavorPickerComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [{ provide: UIHelper, useClass: UIHelperMock }],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewFlavorPickerComponent);
    component = fixture.componentInstance;
    component.flavorEl = {
      setSelectedFlavors(_selectedFlavors: {}) {},
    } as CuppingFlavorsComponent;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
