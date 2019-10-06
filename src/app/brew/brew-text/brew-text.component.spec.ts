import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BrewTextComponent } from './brew-text.component';

describe('BrewTextComponent', () => {
  let component: BrewTextComponent;
  let fixture: ComponentFixture<BrewTextComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BrewTextComponent ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
