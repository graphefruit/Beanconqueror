import type { Locator } from '@playwright/test';

/**
 * The texts a screen reader stops on when swiping through `root`: the lines
 * of its accessibility tree that are text of their own, not part of the name
 * of a control.
 */
export async function textStops(root: Locator): Promise<string[]> {
  return (await root.ariaSnapshot())
    .split('\n')
    .map((line) => /^\s*- text: "?(.*?)"?$/.exec(line)?.[1])
    .filter((text): text is string => text !== undefined);
}
