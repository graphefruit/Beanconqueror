import { DEFAULT_GRAPH_COLORS } from '../../../data/defaultGraphColors';
import { Settings } from '../settings';

describe('Settings — brew event markers', () => {
  describe('default construction', () => {
    it('should default brew_event_markers_enabled to false and mode to line', () => {
      const settings = new Settings();

      expect(settings.brew_event_markers_enabled).toBe(false);
      expect(settings.brew_event_markers_mode).toBe('line');
    });

    it('should initialize graph_colors.bloomMarker with all four color variants', () => {
      const settings = new Settings();
      const marker = settings.graph_colors.bloomMarker;

      expect(marker).toBeTruthy();
      expect(marker.active.light).toBeTruthy();
      expect(marker.active.dark).toBeTruthy();
      expect(marker.reference.light).toBeTruthy();
      expect(marker.reference.dark).toBeTruthy();
    });

    it('should initialize graph_colors.firstDripMarker with all four color variants', () => {
      const settings = new Settings();
      const marker = settings.graph_colors.firstDripMarker;

      expect(marker).toBeTruthy();
      expect(marker.active.light).toBeTruthy();
      expect(marker.active.dark).toBeTruthy();
      expect(marker.reference.light).toBeTruthy();
      expect(marker.reference.dark).toBeTruthy();
    });
  });

  describe('initializeByObject — all fields present', () => {
    it('should preserve brew_event_markers_enabled and mode when serialized object contains them', () => {
      const settings = new Settings();
      const serialized = JSON.parse(JSON.stringify(settings));
      serialized.brew_event_markers_enabled = true;
      serialized.brew_event_markers_mode = 'region';

      settings.initializeByObject(serialized);

      expect(settings.brew_event_markers_enabled).toBe(true);
      expect(settings.brew_event_markers_mode).toBe('region');
    });

    it('should preserve graph_colors.bloomMarker and firstDripMarker when present', () => {
      const settings = new Settings();
      const serialized = JSON.parse(JSON.stringify(settings));

      settings.initializeByObject(serialized);

      expect(settings.graph_colors.bloomMarker).toEqual(
        DEFAULT_GRAPH_COLORS.bloomMarker,
      );
      expect(settings.graph_colors.firstDripMarker).toEqual(
        DEFAULT_GRAPH_COLORS.firstDripMarker,
      );
    });
  });

  describe('initializeByObject — legacy / missing fields', () => {
    it('should leave brew_event_markers_enabled as false when missing from legacy payload', () => {
      const settings = new Settings();
      const legacy = JSON.parse(JSON.stringify(new Settings()));
      delete legacy.brew_event_markers_enabled;

      expect(() => settings.initializeByObject(legacy)).not.toThrow();
      expect(settings.brew_event_markers_enabled).toBe(false);
    });

    it('should populate bloomMarker from defaults when absent from graph_colors', () => {
      const settings = new Settings();
      const legacy = JSON.parse(JSON.stringify(new Settings()));
      delete legacy.graph_colors.bloomMarker;

      expect(() => settings.initializeByObject(legacy)).not.toThrow();
      expect(settings.graph_colors.bloomMarker).toEqual(
        DEFAULT_GRAPH_COLORS.bloomMarker,
      );
    });

    it('should populate firstDripMarker from defaults when absent from graph_colors', () => {
      const settings = new Settings();
      const legacy = JSON.parse(JSON.stringify(new Settings()));
      delete legacy.graph_colors.firstDripMarker;

      expect(() => settings.initializeByObject(legacy)).not.toThrow();
      expect(settings.graph_colors.firstDripMarker).toEqual(
        DEFAULT_GRAPH_COLORS.firstDripMarker,
      );
    });

    it('should reset graph_colors to full defaults including marker colors when graph_colors is absent', () => {
      const settings = new Settings();
      const legacy = JSON.parse(JSON.stringify(new Settings()));
      delete legacy.graph_colors;

      expect(() => settings.initializeByObject(legacy)).not.toThrow();
      expect(settings.graph_colors.bloomMarker).toEqual(
        DEFAULT_GRAPH_COLORS.bloomMarker,
      );
      expect(settings.graph_colors.firstDripMarker).toEqual(
        DEFAULT_GRAPH_COLORS.firstDripMarker,
      );
    });
  });
});
