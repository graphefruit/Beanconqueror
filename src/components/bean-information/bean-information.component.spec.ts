import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanInformationComponent } from './bean-information.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIHelperMock, UIImageMock } from '../../classes/mock';
import { UIImage } from '../../services/uiImage';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Bean } from '../../classes/bean/bean';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('BeanInformationComponent', () => {
  let component: BeanInformationComponent;
  let fixture: ComponentFixture<BeanInformationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [BeanInformationComponent],
    imports: [IonicModule.forRoot(),
        TranslateModule.forRoot()],
    providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
        {
            provide: UIImage,
            useClass: UIImageMock,
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BeanInformationComponent);
    component = fixture.componentInstance;
    component.bean = new Bean();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
