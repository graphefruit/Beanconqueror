import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LicencesComponent } from './licences.component';

describe('LicencesComponent', () => {
  let component: LicencesComponent;
  let fixture: ComponentFixture<LicencesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LicencesComponent ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LicencesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
