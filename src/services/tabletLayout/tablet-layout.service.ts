import { DOCUMENT, inject, Injectable } from '@angular/core';

/** Class on the document element that switches on the tablet layout rules in app.scss. */
export const TABLET_CLASS = 'bq-tablet';

/**
 * Shortest screen side (CSS px) from which a device is a tablet, as Android's
 * sw600dp. Phones stay below it in every orientation (the largest are about
 * 440px), the smallest iPad has 744px.
 */
export const TABLET_MIN_SHORTEST_SIDE = 600;

/**
 * Marks tablets on the document element. The viewport width alone cannot tell a
 * phone in landscape from a tablet, and the viewport height shrinks while the
 * on-screen keyboard is open, so the decision uses the screen, which neither
 * rotation nor the keyboard changes. Folding a device changes the screen and
 * fires a resize, so the mark is checked again then.
 */
@Injectable({
  providedIn: 'root',
})
export class TabletLayoutService {
  private readonly document = inject(DOCUMENT);

  public start(): void {
    this.apply();
    this.document.defaultView?.addEventListener('resize', () => this.apply());
  }

  private apply(): void {
    const screen = this.document.defaultView?.screen;
    const shortestSide = screen ? Math.min(screen.width, screen.height) : 0;
    this.document.documentElement.classList.toggle(
      TABLET_CLASS,
      shortestSide >= TABLET_MIN_SHORTEST_SIDE,
    );
  }
}
