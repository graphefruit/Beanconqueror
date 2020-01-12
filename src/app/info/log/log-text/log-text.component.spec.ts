import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {LogTextComponent} from './log-text.component';

describe('LogTextComponent', () => {
  let component: LogTextComponent;
  let fixture: ComponentFixture<LogTextComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [LogTextComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LogTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
