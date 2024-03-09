import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GraphPage } from './graph.page';

describe('GraphPage', () => {
  let component: GraphPage;
  let fixture: ComponentFixture<GraphPage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(GraphPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
