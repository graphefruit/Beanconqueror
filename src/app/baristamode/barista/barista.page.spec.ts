import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaristaPage } from './barista.page';

describe('BaristaPage', () => {
  let component: BaristaPage;
  let fixture: ComponentFixture<BaristaPage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(BaristaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
