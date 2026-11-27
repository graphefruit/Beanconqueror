import {
  baristaGraphHeight,
  MIN_BARISTA_GRAPH_HEIGHT,
} from '../barista-graph-height';
import { BaristaPage } from '../barista.page';

describe('baristaGraphHeight', () => {
  it('fills the page below the top of the graph', () => {
    expect(baristaGraphHeight(800, 300)).toBe(415);
  });

  it('keeps a readable height on a small page', () => {
    expect(baristaGraphHeight(400, 300)).toBe(MIN_BARISTA_GRAPH_HEIGHT);
    expect(baristaGraphHeight(485, 300)).toBe(MIN_BARISTA_GRAPH_HEIGHT);
  });
});

describe('BaristaPage graph', () => {
  it('sizes the opened graph to the room left below it', () => {
    const graph = {
      graphBox: () => ({ top: 300, width: 320 }),
      resize: jasmine.createSpy('resize'),
    };
    const page: BaristaPage = Object.assign(
      Object.create(BaristaPage.prototype),
      {
        ionContent: { nativeElement: { offsetHeight: 800 } },
        brewBrewing: { brewBrewingGraphEl: graph },
      },
    );

    page.resizeGraph();

    expect(graph.resize).toHaveBeenCalledOnceWith(320, 415);
  });
});
