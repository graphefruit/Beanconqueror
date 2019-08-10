import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MillPage } from './mill.page';

describe('MillPage', () => {
  let component: MillPage;
  let fixture: ComponentFixture<MillPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MillPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MillPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
