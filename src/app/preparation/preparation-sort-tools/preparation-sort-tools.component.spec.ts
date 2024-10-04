import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PreparationSortToolsComponent } from './preparation-sort-tools.component';
import { TranslateModule } from '@ngx-translate/core';
import { Preparation } from 'src/classes/preparation/preparation';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';

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
      providers: [
        { provide: InAppBrowser },
        { provide: SocialSharing },
        { provide: FileTransfer },
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
