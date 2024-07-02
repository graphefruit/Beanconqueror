import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { GraphSectionPage } from './graph-section.page';
import { TranslateModule } from '@ngx-translate/core';

describe('GraphSectionPage', () => {
  let component: GraphSectionPage;
  let fixture: ComponentFixture<GraphSectionPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GraphSectionPage],
      imports: [TranslateModule.forRoot()],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphSectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
