import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GraphSectionPage } from './graph-section.page';
import { InfoComponent } from '../info/info.component';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

describe('GraphSectionPage', () => {
  let component: GraphSectionPage;
  let fixture: ComponentFixture<GraphSectionPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GraphSectionPage],
      imports: [TranslateModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(GraphSectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
