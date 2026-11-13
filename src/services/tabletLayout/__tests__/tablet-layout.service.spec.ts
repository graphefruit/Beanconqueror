import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TABLET_CLASS, TabletLayoutService } from '../tablet-layout.service';

describe('TabletLayoutService', () => {
  let root: HTMLElement;
  let screen: { width: number; height: number };
  let resize: () => void;

  function start(width: number, height: number) {
    screen = { width, height };
    root = document.implementation.createHTMLDocument('').documentElement;
    const view = {
      screen,
      addEventListener: (type: string, listener: () => void) => {
        if (type === 'resize') {
          resize = listener;
        }
      },
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: { documentElement: root, defaultView: view },
        },
      ],
    });
    TestBed.inject(TabletLayoutService).start();
  }

  it('marks a tablet in portrait and landscape', () => {
    start(768, 1024);
    expect(root.classList).toContain(TABLET_CLASS);
    screen.width = 1024;
    screen.height = 768;
    resize();
    expect(root.classList).toContain(TABLET_CLASS);
  });

  it('leaves a phone in landscape unmarked although it is wider than 768px', () => {
    start(915, 412);
    expect(root.classList).not.toContain(TABLET_CLASS);
  });

  it('follows a foldable that is folded and unfolded', () => {
    start(673, 841);
    expect(root.classList).toContain(TABLET_CLASS);
    screen.width = 344;
    screen.height = 882;
    resize();
    expect(root.classList).not.toContain(TABLET_CLASS);
  });
});
