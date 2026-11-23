// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  // Components and services of a test are destroyed after it, so it leaves
  // no element and no listener in the page for the tests after it.
  { teardown: { destroyAfterEach: true } },
);

// Scrollbars take no width, as on phones: a classic one (headless Chrome on
// Linux) narrows a list once it overflows, which changes the heights of its
// rows and can make the scrollbar come and go within one frame.
const noScrollbars = document.createElement('style');
noScrollbars.textContent =
  '*, ion-content::part(scroll) { scrollbar-width: none; }';
document.head.append(noScrollbars);
