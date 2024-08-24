import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PreparationSortToolsComponent } from './preparation-sort-tools.component';
import { TranslateModule } from '@ngx-translate/core';
import { Preparation } from 'src/classes/preparation/preparation';

describe('PreparationSortToolsComponent', () => {
  let component: PreparationSortToolsComponent;
  let fixture: ComponentFixture<PreparationSortToolsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PreparationSortToolsComponent],
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forChild(),
        TranslateModule.forRoot(),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PreparationSortToolsComponent);
    component = fixture.componentInstance;
    component.preparation = new Preparation();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
