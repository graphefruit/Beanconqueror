import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GraphPopoverActionsComponent } from './graph-popover-actions.component';
import { TranslateModule } from '@ngx-translate/core';

describe('GraphPopoverActionsComponent', () => {
  let component: GraphPopoverActionsComponent;
  let fixture: ComponentFixture<GraphPopoverActionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GraphPopoverActionsComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphPopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
