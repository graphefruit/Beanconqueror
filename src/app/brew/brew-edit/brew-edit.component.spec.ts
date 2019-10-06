import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BrewEditComponent } from './brew-edit.component';

describe('BrewEditComponent', () => {
  let component: BrewEditComponent;
  let fixture: ComponentFixture<BrewEditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BrewEditComponent ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
