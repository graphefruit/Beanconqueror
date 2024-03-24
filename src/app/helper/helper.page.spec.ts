import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HelperPage } from './helper.page';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('HelperPage', () => {
  let component: HelperPage;
  let fixture: ComponentFixture<HelperPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        Storage,
        CommonModule,
        IonicModule,
      ],
      declarations: [HelperPage],
      providers: [],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(HelperPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**it('Should calculate the right german water hardness', () => {
    component.waterhardness.ca = 23;
    component.waterhardness.ga = 23;
    const germanHardness: string = component.getGermanHardness();
    expect(germanHardness).toBe('8.53');
  });**/
});
