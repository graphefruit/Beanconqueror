import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { WelcomePopoverComponent } from './welcome-popover.component';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIHelperMock } from '../../classes/mock';
import { Storage } from '@ionic/storage';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('WelcomePopoverComponent', () => {
  let component: WelcomePopoverComponent;
  let fixture: ComponentFixture<WelcomePopoverComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [WelcomePopoverComponent],
    imports: [IonicModule.forRoot(),
        TranslateModule.forRoot()],
    providers: [
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Storage },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WelcomePopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
