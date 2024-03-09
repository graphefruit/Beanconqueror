import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AsyncImageComponent } from './async-image.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { IonicStorageModule } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { File } from '@awesome-cordova-plugins/file/ngx';

describe('AsyncImageComponent', () => {
  let component: AsyncImageComponent;
  let fixture: ComponentFixture<AsyncImageComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        IonicStorageModule.forRoot(),
        CommonModule,
        IonicModule,
      ],
      declarations: [AsyncImageComponent],
      providers: [{ provide: Storage }, { provide: File }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AsyncImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
