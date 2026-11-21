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

/** A stretch of the scroller, from `start` to `end`. */
export interface Span {
  readonly start: number;
  readonly end: number;
}

/**
 * How the screen moves so that `row` can be seen in `view`, the part of the
 * screen that nothing covers: not at all (null) while the whole row is in
 * it, or while a row higher than the view shows part of it; by a number of
 * pixels when a row that fits is cut off at an edge; or to the start of the
 * row when nothing of it is in the view.
 */
export function reveal(row: Span, view: Span): number | 'start' | null {
  if (row.end <= view.start || row.start >= view.end) {
    return 'start';
  }
  if (row.end - row.start > view.end - view.start) {
    return null;
  }
  if (row.start < view.start) {
    return row.start - view.start;
  }
  return row.end > view.end ? row.end - view.end : null;
}

/**
 * The indexes of the rows to render, in order, with `index` among them
 * unless it is below 0.
 */
export function withIndex(indexes: number[], index: number): number[] {
  if (index < 0 || indexes.includes(index)) {
    return indexes;
  }
  return [...indexes, index].sort((a, b) => a - b);
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
