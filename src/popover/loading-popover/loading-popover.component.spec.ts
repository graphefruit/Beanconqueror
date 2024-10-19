import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { LoadingPopoverComponent } from './loading-popover.component';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIHelperMock } from '../../classes/mock';
import { Storage } from '@ionic/storage';

describe('LoadingPopoverComponent', () => {
  let component: LoadingPopoverComponent;
  let fixture: ComponentFixture<LoadingPopoverComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [LoadingPopoverComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Storage },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoadingPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
