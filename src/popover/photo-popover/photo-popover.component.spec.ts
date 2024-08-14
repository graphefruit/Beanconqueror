import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PhotoPopoverComponent } from './photo-popover.component';
import { TranslateModule } from '@ngx-translate/core';

describe('PhotoPopoverComponent', () => {
  let component: PhotoPopoverComponent;
  let fixture: ComponentFixture<PhotoPopoverComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PhotoPopoverComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
