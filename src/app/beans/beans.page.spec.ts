import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BeansPage } from './beans.page';

describe('BeansPage', () => {
  let component: BeansPage;
  let fixture: ComponentFixture<BeansPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BeansPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BeansPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
