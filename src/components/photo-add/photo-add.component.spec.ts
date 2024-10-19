import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PhotoAddComponent } from './photo-add.component';
import { UIImage } from '../../services/uiImage';
import { UIImageMock } from '../../classes/mock';

import { TranslateModule } from '@ngx-translate/core';

describe('PhotoAddComponent', () => {
  let component: PhotoAddComponent;
  let fixture: ComponentFixture<PhotoAddComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PhotoAddComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        {
          provide: UIImage,
          useClass: UIImageMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
