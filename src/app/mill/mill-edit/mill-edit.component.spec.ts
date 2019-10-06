import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MillEditComponent } from './mill-edit.component';

describe('MillEditComponent', () => {
  let component: MillEditComponent;
  let fixture: ComponentFixture<MillEditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MillEditComponent ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MillEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
