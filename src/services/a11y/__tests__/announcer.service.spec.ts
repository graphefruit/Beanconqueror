import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import {
  Announcer,
  PROGRESS_INTERVAL_MS,
  REPEAT_WINDOW_MS,
} from '../announcer.service';
import {
  AnnouncementPoliteness,
  LIVE_REGION,
  LiveRegion,
} from '../live-region';

/** Stands in for the CDK live region and keeps what screen readers would hear. */
class FakeLiveRegion implements LiveRegion {
  public readonly heard: {
    message: string;
    politeness: AnnouncementPoliteness;
  }[] = [];

  public announce(message: string, politeness: AnnouncementPoliteness): void {
    this.heard.push({ message, politeness });
  }

  public messages(): string[] {
    return this.heard.map(({ message }) => message);
  }
}

describe('Announcer', () => {
  let liveRegion: FakeLiveRegion;

  function createAnnouncer(): Announcer {
    liveRegion = new FakeLiveRegion();
    TestBed.configureTestingModule({
      providers: [{ provide: LIVE_REGION, useValue: liveRegion }],
    });
    return TestBed.inject(Announcer);
  }

  describe('announce', () => {
    it('speaks a message politely unless told otherwise', () => {
      const announcer = createAnnouncer();

      expect(announcer.announce('Brew added successfully')).toBeTrue();
      expect(announcer.announce('Scale disconnected', 'assertive')).toBeTrue();

      expect(liveRegion.heard).toEqual([
        { message: 'Brew added successfully', politeness: 'polite' },
        { message: 'Scale disconnected', politeness: 'assertive' },
      ]);
    });

    it('passes the text on with its white space collapsed', () => {
      const announcer = createAnnouncer();

      announcer.announce('  Brew \n added   successfully ');

      expect(liveRegion.messages()).toEqual(['Brew added successfully']);
    });

    it('says nothing for an empty message', () => {
      const announcer = createAnnouncer();

      expect(announcer.announce('')).toBeFalse();
      expect(announcer.announce(' \n ')).toBeFalse();
      expect(announcer.announce(undefined as unknown as string)).toBeFalse();

      expect(liveRegion.heard).toEqual([]);
    });

    it('does not repeat a message within the repeat window', fakeAsync(() => {
      const announcer = createAnnouncer();

      announcer.announce('Scale connected');
      tick(REPEAT_WINDOW_MS - 1);
      expect(announcer.announce('Scale connected')).toBeFalse();
      expect(announcer.announce(' Scale  connected ', 'assertive')).toBeFalse();
      tick(1);
      expect(announcer.announce('Scale connected')).toBeTrue();

      expect(liveRegion.messages()).toEqual([
        'Scale connected',
        'Scale connected',
      ]);
    }));

    it('speaks a message again once another came in between', () => {
      const announcer = createAnnouncer();

      announcer.announce('Please wait...');
      announcer.announce('Brew added successfully');
      announcer.announce('Please wait...');

      expect(liveRegion.messages()).toEqual([
        'Please wait...',
        'Brew added successfully',
        'Please wait...',
      ]);
    });
  });

  describe('startProgress', () => {
    it('speaks the first message at once, politely', () => {
      const announcer = createAnnouncer();

      announcer.startProgress('Please wait...');

      expect(liveRegion.heard).toEqual([
        { message: 'Please wait...', politeness: 'polite' },
      ]);
    });

    it('speaks an update at once when the interval is over', fakeAsync(() => {
      const announcer = createAnnouncer();
      const progress = announcer.startProgress('Starting in 5');

      tick(PROGRESS_INTERVAL_MS);
      progress.update('Starting in 2');

      expect(liveRegion.messages()).toEqual(['Starting in 5', 'Starting in 2']);
      progress.end();
    }));

    it('holds updates back until the interval is over and speaks the latest', fakeAsync(() => {
      const announcer = createAnnouncer();
      const progress = announcer.startProgress('Starting in 5');

      tick(1000);
      progress.update('Starting in 4');
      tick(1000);
      progress.update('Starting in 3');
      tick(PROGRESS_INTERVAL_MS - 2001);
      expect(liveRegion.messages()).toEqual(['Starting in 5']);

      tick(1);
      expect(liveRegion.messages()).toEqual(['Starting in 5', 'Starting in 3']);
      progress.end();
    }));

    it('speaks at most one update per interval', fakeAsync(() => {
      const announcer = createAnnouncer();
      const progress = announcer.startProgress('Reading the label');

      tick(100);
      progress.update('Reading the roaster');
      tick(PROGRESS_INTERVAL_MS);
      progress.update('Reading the origin');
      tick(PROGRESS_INTERVAL_MS - 101);
      expect(liveRegion.messages()).toEqual([
        'Reading the label',
        'Reading the roaster',
      ]);

      tick(1);
      expect(liveRegion.messages()).toEqual([
        'Reading the label',
        'Reading the roaster',
        'Reading the origin',
      ]);
      progress.end();
    }));

    it('does not repeat the message spoken last', fakeAsync(() => {
      const announcer = createAnnouncer();
      const progress = announcer.startProgress('Please wait...');

      tick(PROGRESS_INTERVAL_MS);
      progress.update(' Please wait... ');
      tick(PROGRESS_INTERVAL_MS);

      expect(liveRegion.messages()).toEqual(['Please wait...']);
      progress.end();
    }));

    it('drops a waiting update when the message goes back to the one spoken last', fakeAsync(() => {
      const announcer = createAnnouncer();
      const progress = announcer.startProgress('Connecting');

      tick(1000);
      progress.update('Connecting again');
      tick(1000);
      progress.update('Connecting');
      tick(PROGRESS_INTERVAL_MS);

      expect(liveRegion.messages()).toEqual(['Connecting']);
      progress.end();
    }));

    it('ignores empty updates', fakeAsync(() => {
      const announcer = createAnnouncer();
      const progress = announcer.startProgress('Please wait...');

      tick(PROGRESS_INTERVAL_MS);
      progress.update('');
      progress.update('  ');

      expect(liveRegion.messages()).toEqual(['Please wait...']);
      progress.end();
    }));

    it('says nothing when it ends and drops an update still waiting', fakeAsync(() => {
      const announcer = createAnnouncer();
      const progress = announcer.startProgress('Importing');

      tick(1000);
      progress.update('Importing brews');
      progress.end();
      progress.end();
      tick(PROGRESS_INTERVAL_MS);
      progress.update('Importing beans');
      tick(PROGRESS_INTERVAL_MS);

      expect(liveRegion.messages()).toEqual(['Importing']);
    }));

    it('keeps progress announcements apart from each other', fakeAsync(() => {
      const announcer = createAnnouncer();
      const first = announcer.startProgress('Connecting');
      first.end();
      const second = announcer.startProgress('Reading');

      tick(1000);
      first.update('Connected');
      second.update('Read');
      tick(PROGRESS_INTERVAL_MS);

      expect(liveRegion.messages()).toEqual(['Connecting', 'Reading', 'Read']);
      second.end();
    }));
  });
});
