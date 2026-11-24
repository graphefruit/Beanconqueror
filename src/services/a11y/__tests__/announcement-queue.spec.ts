import {
  enqueueAnnouncement,
  takeNextAnnouncement,
} from '../announcement-queue';

interface Message {
  text: string;
  key?: string;
}

describe('enqueueAnnouncement', () => {
  it('keeps every message without a key, in order', () => {
    let waiting = enqueueAnnouncement<Message>([], { text: 'Bean saved' });
    waiting = enqueueAnnouncement<Message>(waiting, { text: 'Bean saved' });
    waiting = enqueueAnnouncement<Message>(waiting, { text: 'Brew started' });

    expect(waiting.map(({ text }) => text)).toEqual([
      'Bean saved',
      'Bean saved',
      'Brew started',
    ]);
  });

  it('keeps only the newest value of a key, behind the messages before it', () => {
    let waiting = enqueueAnnouncement<Message>([], {
      text: 'Time 1',
      key: 'time',
    });
    waiting = enqueueAnnouncement<Message>(waiting, {
      text: '18',
      key: 'weight',
    });
    waiting = enqueueAnnouncement<Message>(waiting, { text: 'Brew started' });
    waiting = enqueueAnnouncement<Message>(waiting, {
      text: 'Time 2',
      key: 'time',
    });
    waiting = enqueueAnnouncement<Message>(waiting, {
      text: '19',
      key: 'weight',
    });

    expect(waiting).toEqual([
      { text: 'Brew started' },
      { text: 'Time 2', key: 'time' },
      { text: '19', key: 'weight' },
    ]);
  });

  it('leaves the waiting messages as they are', () => {
    const waiting: Message[] = [{ text: 'Time 1', key: 'time' }];

    enqueueAnnouncement<Message>(waiting, { text: 'Time 2', key: 'time' });

    expect(waiting).toEqual([{ text: 'Time 1', key: 'time' }]);
  });
});

describe('takeNextAnnouncement', () => {
  const time: Message = { text: 'Time 2', key: 'time' };
  const weight: Message = { text: '19', key: 'weight' };
  const started: Message = { text: 'Brew started' };

  it('takes the first message', () => {
    expect(takeNextAnnouncement([time, weight], 'weight')).toEqual([
      time,
      [weight],
    ]);
    expect(takeNextAnnouncement([time, weight], undefined)).toEqual([
      time,
      [weight],
    ]);
  });

  it('lets another message go before a value of the key said last', () => {
    expect(takeNextAnnouncement([time, weight], 'time')).toEqual([
      weight,
      [time],
    ]);
    expect(takeNextAnnouncement([time, started, weight], 'time')).toEqual([
      started,
      [time, weight],
    ]);
  });

  it('takes the value of the key said last when nothing else waits', () => {
    expect(takeNextAnnouncement([time], 'time')).toEqual([time, []]);
    expect(takeNextAnnouncement<Message>([], 'time')).toBeUndefined();
  });
});
