import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BrewAddComponent } from './brew-add.component';

describe('BrewAddComponent', () => {
  let component: BrewAddComponent;
  let fixture: ComponentFixture<BrewAddComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BrewAddComponent ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
