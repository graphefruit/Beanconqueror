import { Config } from './objectConfig';

describe('Config', () => {
  it('sets defaults in constructor', () => {
    const config = new Config();
    expect(config.uuid).toBe('');
    expect(config.unix_timestamp).toBe(0);
  });
});
