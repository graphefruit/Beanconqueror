/** Room the barista page keeps below the graph, for the controls under it. */
const BELOW_GRAPH = 85;
export const MIN_BARISTA_GRAPH_HEIGHT = 100;

/** The graph fills the page below its top, but never gets too small to read. */
export function baristaGraphHeight(
  pageHeight: number,
  graphTop: number,
): number {
  return Math.max(
    MIN_BARISTA_GRAPH_HEIGHT,
    pageHeight - (graphTop + BELOW_GRAPH),
  );
}
