import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';

import { NavController } from '@ionic/angular';

import { TranslateModule } from '@ngx-translate/core';

import { BrewParameterPage } from '../brew-parameter.page';

describe('BrewParameterPage', () => {
  it('links to the preparation methods in the profile tab', () => {
    TestBed.configureTestingModule({
      imports: [BrewParameterPage, TranslateModule.forRoot()],
      providers: [provideRouter([]), { provide: NavController, useValue: {} }],
    });
    const fixture = TestBed.createComponent(BrewParameterPage);
    fixture.detectChanges();

    const links = fixture.debugElement
      .queryAll(By.directive(RouterLink))
      .map((element) => element.injector.get(RouterLink).urlTree?.toString());
    expect(links).toEqual(['/home/profile/preparations']);
  });
});
