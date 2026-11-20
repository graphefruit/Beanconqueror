import { TestBed } from '@angular/core/testing';

import { HeaderComponent } from '../header.component';

describe('HeaderComponent', () => {
  it('shows the title as the level-1 heading of the screen', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.componentRef.setInput('title', 'Beans');
    fixture.detectChanges();

    const heading = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="heading"]',
    );

    expect(heading?.getAttribute('aria-level')).toBe('1');
    expect(heading?.textContent).toBe('Beans');
  });
});
