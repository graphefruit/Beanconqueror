import { errorSummary, LOG_TEXT_LENGTH, textSummary } from '../logSummary';

describe('errorSummary', () => {
  it('keeps the type of an error and leaves out its message', () => {
    expect(
      errorSummary(new TypeError('Failed to fetch https://user:key@host/')),
    ).toBe('TypeError');
  });

  it('adds the HTTP status an error carries', () => {
    const error = Object.assign(new Error('{"account":"user@example.org"}'), {
      status: 401,
    });

    expect(errorSummary(error)).toBe('Error (status 401)');
    expect(errorSummary({ status: 500, data: 'answer' })).toBe(
      'object (status 500)',
    );
  });

  it('names what was thrown when it is no error', () => {
    expect(errorSummary('secret answer')).toBe('string');
    expect(errorSummary(null)).toBe('object');
    expect(errorSummary(undefined)).toBe('undefined');
  });
});

describe('textSummary', () => {
  it('keeps a short text as it is', () => {
    const text = 'x'.repeat(LOG_TEXT_LENGTH);

    expect(textSummary(text)).toBe(text);
    expect(textSummary('')).toBe('');
  });

  it('keeps the start of a long text and tells its length', () => {
    const text = 'a'.repeat(LOG_TEXT_LENGTH) + 'rest of the label';

    expect(textSummary(text)).toBe(
      `${'a'.repeat(LOG_TEXT_LENGTH)}… (${text.length} chars)`,
    );
  });
});
