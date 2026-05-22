import { TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular/standalone';

import { TranslateModule } from '@ngx-translate/core';
import moment from 'moment';

import { Brew } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';
import { CoffeeBluetoothDevicesService } from '../../coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { ThemeService } from '../../theme/theme.service';
import { UISettingsStorage } from '../../uiSettingsStorage';
import { GraphHelperService } from '../graph-helper.service';

function makeBrew(opts: {
  coffee_blooming_time?: number;
  coffee_first_drip_time?: number;
}): Brew {
  const brew = new Brew();
  brew.coffee_blooming_time = opts.coffee_blooming_time ?? 0;
  brew.coffee_first_drip_time = opts.coffee_first_drip_time ?? 0;
  return brew;
}

function makeSettings(opts: {
  enabled?: boolean;
  mode?: string;
  darkMode?: boolean;
}): Settings {
  const s = new Settings();
  s.brew_event_markers_enabled = opts.enabled ?? true;
  s.brew_event_markers_mode = opts.mode ?? 'line';
  return s;
}

describe('GraphHelperService.getEventMarkerShapes', () => {
  let service: GraphHelperService;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;

  beforeEach(() => {
    themeServiceSpy = jasmine.createSpyObj('ThemeService', ['isDarkMode']);
    themeServiceSpy.isDarkMode.and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        GraphHelperService,
        { provide: ThemeService, useValue: themeServiceSpy },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => new Settings() },
        },
        { provide: Platform, useValue: { is: () => false } },
        { provide: CoffeeBluetoothDevicesService, useValue: {} },
      ],
    });

    service = TestBed.inject(GraphHelperService);
  });

  it('returns empty when markers are disabled', () => {
    const result = service.getEventMarkerShapes(
      makeBrew({ coffee_blooming_time: 10, coffee_first_drip_time: 20 }),
      makeSettings({ enabled: false }),
    );
    expect(result.shapes).toEqual([]);
    expect(result.annotations).toEqual([]);
  });

  it('returns empty when both values are 0', () => {
    const result = service.getEventMarkerShapes(
      makeBrew({}),
      makeSettings({ enabled: true }),
    );
    expect(result.shapes).toEqual([]);
    expect(result.annotations).toEqual([]);
  });

  it('returns one shape when only blooming time is set', () => {
    const result = service.getEventMarkerShapes(
      makeBrew({ coffee_blooming_time: 10 }),
      makeSettings({ enabled: true }),
    );
    expect(result.shapes.length).toBe(1);
    expect(result.shapes[0].customId).toBe('bloomShape');
  });

  it('returns one shape when only first drip time is set', () => {
    const result = service.getEventMarkerShapes(
      makeBrew({ coffee_first_drip_time: 14 }),
      makeSettings({ enabled: true }),
    );
    expect(result.shapes.length).toBe(1);
    expect(result.shapes[0].customId).toBe('firstDripShape');
  });

  it('returns two shapes when both values are non-zero', () => {
    const result = service.getEventMarkerShapes(
      makeBrew({ coffee_blooming_time: 4, coffee_first_drip_time: 14 }),
      makeSettings({ enabled: true }),
    );
    expect(result.shapes.length).toBe(2);
  });

  describe('line mode', () => {
    it('produces type:line shapes', () => {
      const result = service.getEventMarkerShapes(
        makeBrew({ coffee_blooming_time: 4, coffee_first_drip_time: 14 }),
        makeSettings({ enabled: true, mode: 'line' }),
      );
      for (const shape of result.shapes) {
        expect(shape.type).toBe('line');
        expect(shape.x0).toEqual(shape.x1);
      }
    });

    it('includes annotations in line mode', () => {
      const result = service.getEventMarkerShapes(
        makeBrew({ coffee_blooming_time: 4, coffee_first_drip_time: 14 }),
        makeSettings({ enabled: true, mode: 'line' }),
      );
      expect(result.annotations.length).toBe(2);
      const labels = result.annotations.map((a) => a.text);
      expect(labels).toContain('Bloom');
      expect(labels).toContain('First drip');
    });

    it('x coordinate matches expected seconds offset from start of day', () => {
      const seconds = 14;
      const expected = moment(new Date())
        .startOf('day')
        .add(seconds, 'seconds')
        .toDate()
        .getTime();

      const result = service.getEventMarkerShapes(
        makeBrew({ coffee_first_drip_time: seconds }),
        makeSettings({ enabled: true, mode: 'line' }),
      );
      expect(result.shapes[0].x0.getTime()).toBe(expected);
    });
  });

  describe('region mode', () => {
    it('produces type:rect shapes', () => {
      const result = service.getEventMarkerShapes(
        makeBrew({ coffee_blooming_time: 4, coffee_first_drip_time: 14 }),
        makeSettings({ enabled: true, mode: 'region' }),
      );
      for (const shape of result.shapes) {
        expect(shape.type).toBe('rect');
      }
    });

    it('produces no annotations in region mode', () => {
      const result = service.getEventMarkerShapes(
        makeBrew({ coffee_blooming_time: 4, coffee_first_drip_time: 14 }),
        makeSettings({ enabled: true, mode: 'region' }),
      );
      expect(result.annotations.length).toBe(0);
    });

    it('x0 is start of day and x1 is the event time', () => {
      const seconds = 10;
      const startOfDay = moment(new Date()).startOf('day').toDate().getTime();
      const expected = moment(new Date())
        .startOf('day')
        .add(seconds, 'seconds')
        .toDate()
        .getTime();

      const result = service.getEventMarkerShapes(
        makeBrew({ coffee_blooming_time: seconds }),
        makeSettings({ enabled: true, mode: 'region' }),
      );
      expect(result.shapes[0].x0.getTime()).toBe(startOfDay);
      expect(result.shapes[0].x1.getTime()).toBe(expected);
    });
  });

  describe('dark mode colour selection', () => {
    it('selects active.dark color in dark mode', () => {
      themeServiceSpy.isDarkMode.and.returnValue(true);
      const settings = makeSettings({ enabled: true, mode: 'line' });
      const darkColor = settings.graph_colors.bloomMarker.active.dark;

      const result = service.getEventMarkerShapes(
        makeBrew({ coffee_blooming_time: 5 }),
        settings,
      );
      expect(result.shapes[0].line.color).toBe(darkColor);
    });

    it('selects active.light color in light mode', () => {
      themeServiceSpy.isDarkMode.and.returnValue(false);
      const settings = makeSettings({ enabled: true, mode: 'line' });
      const lightColor = settings.graph_colors.bloomMarker.active.light;

      const result = service.getEventMarkerShapes(
        makeBrew({ coffee_blooming_time: 5 }),
        settings,
      );
      expect(result.shapes[0].line.color).toBe(lightColor);
    });
  });
});
