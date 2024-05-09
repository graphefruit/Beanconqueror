import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CuppingFlavorsComponent } from './cupping-flavors.component';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelperMock } from '../../classes/mock';
import { UIHelper } from '../../services/uiHelper';

describe('CuppingFlavorsComponent', () => {
  let component: CuppingFlavorsComponent;
  let fixture: ComponentFixture<CuppingFlavorsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [CuppingFlavorsComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [{ provide: UIHelper, useClass: UIHelperMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(CuppingFlavorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
