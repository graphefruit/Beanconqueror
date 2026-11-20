import { expect, type Locator } from '@playwright/test';

/**
 * The list of a page: the building block `app-virtual-list`, marked with `data-virtual-list`,
 * which scrolls the `ion-content` around it and renders only the rows near the screen.
 */
export const VIRTUAL_LIST = '[data-virtual-list]';

/**
 * Scrolls a list to its end and waits until it stays there: the building block (`VIRTUAL_LIST`),
 * whose `ion-content` scrolls, or a list of `ag-virtual-scroll`, which scrolls itself. A list
 * counts the rows it has not rendered yet with an estimated height and measures them once they
 * are rendered, so its end moves after the last rows appeared; scrolled until the length no
 * longer changes.
 *
 * `ag-virtual-scroll` is as high as the screen until its page, shortly after it opened, fits it
 * to the space below the toolbar in pixels, and measures a row on the scroll after the one that
 * rendered it.
 */
export async function scrollToEnd(list: Locator): Promise<void> {
  const ownScroller = await list.evaluate(
    (element) => element.localName === 'ag-virtual-scroll',
  );
  if (ownScroller) {
    await expect
      .poll(() => list.evaluate((element) => element.style.height))
      .toMatch(/px$/);
  }
  let previousHeight = -1;
  await expect(async () => {
    const { height, atEnd } = await list.evaluate((element) => {
      const scroller =
        element.localName === 'ag-virtual-scroll'
          ? element
          : element
              .closest('ion-content')
              ?.shadowRoot?.querySelector<HTMLElement>('.inner-scroll');
      if (!scroller) {
        throw new Error('The list is not inside an ion-content');
      }
      scroller.scrollTop = scroller.scrollHeight;
      scroller.dispatchEvent(new Event('scroll'));
      return {
        height: scroller.scrollHeight,
        atEnd:
          scroller.scrollTop + scroller.clientHeight >=
          scroller.scrollHeight - 1,
      };
    });
    const settled = height === previousHeight;
    previousHeight = height;
    expect(atEnd && settled).toBe(true);
  }).toPass();
}

/**
 * Whether a tap on the element reaches it, and not something lying over it: tested in its
 * middle and just inside the middle of its top and bottom edge, as the add button comes in
 * from below. A button of Ionic draws its native button in its shadow root; the hit test
 * answers the host.
 */
export async function isUncovered(element: Locator): Promise<boolean> {
  return element.evaluate((target) => {
    const root = target.getRootNode();
    const host = root instanceof ShadowRoot ? root.host : target;
    const { left, top, right, bottom } = target.getBoundingClientRect();
    const x = (left + right) / 2;
    return [(top + bottom) / 2, top + 2, bottom - 2].every((y) => {
      const hit = document.elementFromPoint(x, y);
      return hit !== null && (hit === host || host.contains(hit));
    });
  });
}
