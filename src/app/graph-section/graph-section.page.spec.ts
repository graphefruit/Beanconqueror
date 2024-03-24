import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GraphSectionPage } from './graph-section.page';

describe('GraphSectionPage', () => {
  let component: GraphSectionPage;
  let fixture: ComponentFixture<GraphSectionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphSectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
