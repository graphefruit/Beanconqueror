import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanInternalShareCodeGeneratorComponent } from './bean-internal-share-code-generator.component';

describe('BeanQrCodeGeneratorComponent', () => {
  let component: BeanInternalShareCodeGeneratorComponent;
  let fixture: ComponentFixture<BeanInternalShareCodeGeneratorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BeanInternalShareCodeGeneratorComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BeanInternalShareCodeGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
