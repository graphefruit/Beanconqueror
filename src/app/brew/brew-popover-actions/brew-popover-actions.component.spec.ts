import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {BrewPopoverActionsComponent} from './brew-popover-actions.component';

describe('BrewPopoverActionsComponent', () => {
  let component: BrewPopoverActionsComponent;
  let fixture: ComponentFixture<BrewPopoverActionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BrewPopoverActionsComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewPopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
