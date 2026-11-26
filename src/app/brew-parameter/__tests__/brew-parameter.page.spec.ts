import { Component, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  NavigationEnd,
  NavigationError,
  provideRouter,
  Router,
  RouterLink,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { NavController } from '@ionic/angular';

import { TranslateModule } from '@ngx-translate/core';
import { filter, firstValueFrom } from 'rxjs';

import { accessibleName } from '../../../test-utils';
import { BeanParameterPage } from '../../bean-parameter/bean-parameter.page';
import { BrewParameterPage } from '../brew-parameter.page';

@Component({ template: '' })
class SubPage {}

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

/**
 * The parameter pages are mounted in the Brews, Beans and Profile tabs, so
 * their pages have to open below wherever the page itself sits.
 */
describe('the parameter pages', () => {
  async function openAt<T>(page: Type<T>, base: string, sub: string) {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: NavController, useValue: {} },
        provideRouter([
          {
            path: base.slice(1),
            children: [
              { path: '', component: page },
              { path: sub, component: SubPage },
            ],
          },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    return harness.navigateByUrl(base, page);
  }

  /** Runs `open` and waits for the navigation it starts. */
  async function urlAfter(open: () => void): Promise<string> {
    const router = TestBed.inject(Router);
    const done = firstValueFrom(
      router.events.pipe(
        filter(
          (event) =>
            event instanceof NavigationEnd || event instanceof NavigationError,
        ),
      ),
    );
    open();
    await done;
    return router.url;
  }

  it('open the brew pages in the Brews tab', async () => {
    const page = await openAt(
      BrewParameterPage,
      '/home/brews/brew-parameter',
      'default',
    );
    expect(await urlAfter(() => page.openDefaultParameters())).toBe(
      '/home/brews/brew-parameter/default',
    );
  });

  it('open the brew pages in the Profile tab', async () => {
    const page = await openAt(
      BrewParameterPage,
      '/home/profile/brew-parameter',
      'manage',
    );
    expect(await urlAfter(() => page.openManageParameters())).toBe(
      '/home/profile/brew-parameter/manage',
    );
  });

  it('open the bean pages in the Beans tab', async () => {
    const page = await openAt(
      BeanParameterPage,
      '/home/beans/bean-parameter',
      'listview',
    );
    expect(await urlAfter(() => page.openListViewParameters())).toBe(
      '/home/beans/bean-parameter/listview',
    );
  });
});

// A sentence on top explains the page; it is no title. The tiles are buttons
// named by their title.
describe('the parameter pages, as read', () => {
  const pages: [string, Type<unknown>, string[], string[]][] = [
    [
      'brew',
      BrewParameterPage,
      [
        'BREW_PARAMETER_CUSTOMIZE_TITLE',
        'BREW_PARAMETER_CUSTOMIZE_DESCRIPTION',
      ],
      [
        'NAV_MANAGE_PARAMETERS',
        'NAV_SORT_PARAMETERS',
        'NAV_DEFAULT_PARAMETERS',
        'NAV_REPEAT_PARAMETERS',
        'NAV_LIST_VIEW_CUSTOM_PARAMETERS',
      ],
    ],
    [
      'bean',
      BeanParameterPage,
      [
        'BEAN_PARAMETER_CUSTOMIZE_TITLE',
        'BEAN_PARAMETER_CUSTOMIZE_DESCRIPTION',
      ],
      ['NAV_MANAGE_PARAMETERS', 'NAV_LIST_VIEW_CUSTOM_PARAMETERS'],
    ],
  ];

  for (const [name, page, description, tiles] of pages) {
    it(`describes the tiles of the ${name} parameters without headings`, () => {
      TestBed.configureTestingModule({
        imports: [page, TranslateModule.forRoot()],
        providers: [
          provideRouter([]),
          { provide: NavController, useValue: {} },
        ],
      });
      const fixture = TestBed.createComponent(page);
      fixture.detectChanges();
      const content = (fixture.nativeElement as HTMLElement).querySelector(
        'ion-content',
      );

      expect(
        content.querySelectorAll('[role="heading"], h1, h2, h3, h4, h5, h6')
          .length,
      ).toBe(0);
      for (const key of description) {
        expect(content.textContent).toContain(key);
      }
      expect(
        [...content.querySelectorAll('ion-card[button]')].map(accessibleName),
      ).toEqual(tiles);
    });
  }
});
