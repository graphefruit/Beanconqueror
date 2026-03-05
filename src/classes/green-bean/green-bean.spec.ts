import { GreenBean } from './green-bean';

describe('GreenBean', () => {
  it('sets defaults in constructor', () => {
    const bean = new GreenBean();
    expect(bean.name).toBe('');
    expect(bean.finished).toBe(false);
    expect(bean.rating).toBe(0);
  });

  it('initializes from object', () => {
    const bean = new GreenBean();
    bean.initializeByObject({ name: 'Test Bean' } as any);
    expect(bean.name).toBe('Test Bean');
  });

  it('calculates bean age in days', () => {
    const bean = new GreenBean();
    const now = new Date(2024, 0, 10).getTime();
    spyOn(Date, 'now').and.returnValue(now);

    bean.date = new Date(2024, 0, 8).toISOString();
    expect(bean.beanAgeInDays()).toBe(2);

    bean.date = 'invalid-date';
    expect(bean.beanAgeInDays()).toBe(0);
  });
});
