import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaristamodePage } from './baristamode.page';

describe('BaristamodePage', () => {
  let component: BaristamodePage;
  let fixture: ComponentFixture<BaristamodePage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(BaristamodePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
