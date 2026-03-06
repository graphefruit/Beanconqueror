import { Graph } from './graph';

describe('Graph', () => {
  it('sets defaults in constructor', () => {
    const graph = new Graph();
    expect(graph.name).toBe('');
    expect(graph.note).toBe('');
    expect(graph.flow_profile).toBe('');
    expect(graph.finished).toBe(false);
    expect(graph.config.uuid).toBe('');
  });

  it('initializes from object', () => {
    const graph = new Graph();
    graph.initializeByObject({ name: 'Profile A', finished: true } as any);
    expect(graph.name).toBe('Profile A');
    expect(graph.finished).toBe(true);
  });

  it('builds graph path from uuid', () => {
    const graph = new Graph();
    graph.config.uuid = 'abc-123';
    expect(graph.getGraphPath()).toBe('graphs/abc-123_flow_profile.json');
  });
});
