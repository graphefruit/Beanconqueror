import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {BrewInformationComponent} from './brew-information.component';
import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {Storage} from '@ionic/storage';
import {InAppBrowser} from '@ionic-native/in-app-browser/ngx';
import {File} from '@ionic-native/file/ngx';

describe('BrewInformationComponent', () => {
  let component: BrewInformationComponent;
  let fixture: ComponentFixture<BrewInformationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BrewInformationComponent],
      imports: [IonicModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        {provide: Storage},
        {provide: InAppBrowser},
        {provide: File},
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BrewInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
