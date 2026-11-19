import { expect, type Locator } from '@playwright/test';

/**
 * Scrolls a list (`ag-virtual-scroll`) to its end and waits until it stays there. The list is as
 * high as the screen until its page, shortly after it opened, fits it to the space below the
 * toolbar in pixels. It renders only the entries near the screen and counts the others with
 * their minimum height; it measures an entry on the scroll after the one that rendered it, so its
 * end moves down again after the last entries appeared. Scrolled until the length no longer
 * changes.
 */
export async function scrollToEnd(list: Locator): Promise<void> {
  await expect
    .poll(() => list.evaluate((element) => element.style.height))
    .toMatch(/px$/);
  let previousHeight = -1;
  await expect(async () => {
    const { height, atEnd } = await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event('scroll'));
      return {
        height: element.scrollHeight,
        atEnd:
          element.scrollTop + element.clientHeight >= element.scrollHeight - 1,
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
