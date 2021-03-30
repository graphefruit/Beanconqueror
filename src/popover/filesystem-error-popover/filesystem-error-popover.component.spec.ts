import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { FilesystemErrorPopoverComponent } from './filesystem-error-popover.component';

describe('FilesystemErrorPopoverComponent', () => {
  let component: FilesystemErrorPopoverComponent;
  let fixture: ComponentFixture<FilesystemErrorPopoverComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FilesystemErrorPopoverComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(FilesystemErrorPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
