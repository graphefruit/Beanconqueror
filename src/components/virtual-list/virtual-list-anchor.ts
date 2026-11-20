/** A key that names a row of a virtual list across rebuilds of its items. */
export type RowKey = string | number | bigint;

/** Where a row lies in the scroller, as the virtualizer lays it out. */
export interface RowPosition {
  readonly key: RowKey;
  readonly start: number;
  readonly end: number;
}

/**
 * The row at the top edge of the screen and how far the screen has scrolled
 * into it, so that the same place can be found again after the rows changed;
 * `offset` is the scroll position, for when the row is gone.
 */
export interface ListAnchor {
  readonly key: RowKey;
  readonly offsetInRow: number;
  readonly offset: number;
}

/** The anchor at `offset`, from the rows in order; null without rows. */
export function anchorAt(
  rows: readonly RowPosition[],
  offset: number,
): ListAnchor | null {
  const row = rows.find((candidate) => candidate.end > offset) ?? rows.at(-1);
  if (!row) {
    return null;
  }
  return { key: row.key, offsetInRow: offset - row.start, offset };
}

/**
 * The scroll position that brings `anchor` back: the same place in its row,
 * which starts at `rowStart` now, or the old position if the row is gone.
 * Kept within `0` and `maxOffset`; no anchor is the top.
 */
export function anchorOffset(
  anchor: ListAnchor | null,
  rowStart: number | undefined,
  maxOffset: number,
): number {
  if (!anchor) {
    return 0;
  }
  const offset =
    rowStart === undefined ? anchor.offset : rowStart + anchor.offsetInRow;
  return Math.max(0, Math.min(offset, maxOffset));
}
