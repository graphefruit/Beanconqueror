import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewBrewingPreparationDeviceComponent } from './brew-brewing-preparation-device.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('BrewBrewingPreparationDeviceComponent', () => {
  let component: BrewBrewingPreparationDeviceComponent;
  let fixture: ComponentFixture<BrewBrewingPreparationDeviceComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [BrewBrewingPreparationDeviceComponent],
    imports: [IonicModule.forRoot(),
        TranslateModule.forRoot()],
    providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewBrewingPreparationDeviceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
