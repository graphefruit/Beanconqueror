import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {BeanPhotoViewComponent} from './bean-photo-view.component';

describe('BeanPhotoViewComponent', () => {
  let component: BeanPhotoViewComponent;
  let fixture: ComponentFixture<BeanPhotoViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BeanPhotoViewComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BeanPhotoViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
