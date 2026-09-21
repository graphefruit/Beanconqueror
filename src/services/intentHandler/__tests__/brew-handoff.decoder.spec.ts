import type { IHandoffEnvelope } from '../../../interfaces/brew/IHandoff';
import {
  collectHandoffPayload,
  decodeHandoffPayload,
} from '../brew-handoff.decoder';

async function gzipRawBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function gzipBytes(bytes: Uint8Array): Promise<string> {
  return base64Url(await gzipRawBytes(bytes));
}

async function gzipString(value: string): Promise<string> {
  return gzipBytes(new TextEncoder().encode(value));
}

async function gzipBase64Url(value: unknown): Promise<string> {
  return gzipString(JSON.stringify(value));
}

function handoffUrl(
  payload: string,
  options: { len?: number; omit?: number; chunks?: number } = {},
): string {
  const chunks =
    options.chunks === undefined
      ? (payload.match(/.{1,400}/g) ?? [''])
      : Array.from({ length: options.chunks }, () => '');
  const params = [`len=${options.len ?? payload.length}`];
  chunks.forEach((chunk, index) => {
    if (index !== options.omit) {
      params.push(`shareBrew${index}=${chunk}`);
    }
  });
  return `beanconqueror://ADD_BREW?${params.join('&')}`;
}

function validEnvelope(
  overrides: Partial<IHandoffEnvelope> = {},
): IHandoffEnvelope {
  return {
    v: 1,
    app: { name: 'Sender', version: '1.0' },
    brew: {
      date: '2026-09-20T12:00:00.000Z',
      doseIn: { value: 18, unit: 'g' },
      waterIn: { value: 300, unit: 'ml' },
      beverageOut: { value: 240, unit: 'g' },
      brewTime: 210,
      temperature: 93,
      ratio: 16.7,
      grindSize: '42',
      grinderRpm: 60,
      grinderName: 'Any grinder',
      preparationMethod: 'Any brewer',
      bloomTime: 35,
      firstDripTime: 12,
      note: 'A completed brew',
    },
    bean: { name: 'Any coffee' },
    flow: {
      fidelity: 'full',
      t: [0, 1000, 1000],
      waterDispensed: [0, 125, 125],
      weight: [0, 50, 75],
      temperature: [91, 92, 93],
    },
    metrics: [
      {
        key: 'targetTemperature',
        name: 'Target temp',
        unit: '°C',
        kind: 'target',
        t: [0, 200000],
        v: [93, 93],
      },
    ],
    imported: {
      source: 'any-sender',
      sourceName: 'Any Sender',
      sourceUrl: 'https://example.com/brew/1',
      device: 'Any brewer',
      schema: 1,
      params: { recipe: 'abc123' },
    },
    ...overrides,
  };
}

async function decodeEnvelope(
  envelope: unknown = validEnvelope(),
): Promise<IHandoffEnvelope> {
  return decodeHandoffPayload(await gzipBase64Url(envelope));
}

describe('brew handoff decoder', () => {
  const nativeDecompressionStream = DecompressionStream;

  afterEach(() => {
    (
      window as unknown as { DecompressionStream?: typeof DecompressionStream }
    ).DecompressionStream = nativeDecompressionStream;
  });

  it('rejects missing and malformed query parameters', () => {
    expect(() =>
      collectHandoffPayload('beanconqueror://ADD_BREW'),
    ).toThrowError('Missing brew handoff query');
    expect(() =>
      collectHandoffPayload('beanconqueror://ADD_BREW?len=4'),
    ).toThrowError('Missing shareBrew chunks');
    expect(() =>
      collectHandoffPayload('beanconqueror://ADD_BREW?len=x&shareBrew0=abcd'),
    ).toThrowError('Missing or malformed brew handoff len');
    expect(() =>
      collectHandoffPayload(
        'beanconqueror://ADD_BREW?len=9007199254740992&shareBrew0=abcd',
      ),
    ).toThrowError('Brew handoff len is too large');
  });

  it('rejects a missing chunk in the sequence', () => {
    const payload = 'a'.repeat(850);

    expect(() =>
      collectHandoffPayload(handoffUrl(payload, { omit: 1 })),
    ).toThrowError('Missing shareBrew chunk 1');
  });

  it('rejects a repeated chunk index', () => {
    expect(() =>
      collectHandoffPayload(
        'beanconqueror://ADD_BREW?len=1&shareBrew0=a&shareBrew0=b',
      ),
    ).toThrowError('Duplicate shareBrew chunk 0');
  });

  it('rejects chunk indexes that collide after normalisation', () => {
    expect(() =>
      collectHandoffPayload(
        'beanconqueror://ADD_BREW?len=1&shareBrew0=a&shareBrew00=b',
      ),
    ).toThrowError('Duplicate shareBrew chunk 0');
  });

  it('accepts a well-formed multi-chunk handoff payload', () => {
    const payload = `${'a'.repeat(400)}${'b'.repeat(250)}`;

    expect(collectHandoffPayload(handoffUrl(payload))).toBe(payload);
  });

  it('rejects too many chunks before assembly', () => {
    expect(() =>
      collectHandoffPayload(handoffUrl('', { chunks: 1025 })),
    ).toThrowError('Too many shareBrew chunks: maximum is 1024');
  });

  it('accepts the sender URL budget while keeping the receiver backstop finite', () => {
    const payload = 'a'.repeat(328 * 400);

    expect(collectHandoffPayload(handoffUrl(payload))).toBe(payload);
    expect(() =>
      collectHandoffPayload(handoffUrl('', { chunks: 1025 })),
    ).toThrowError('Too many shareBrew chunks: maximum is 1024');
  });

  it('rejects oversized compressed payloads before and during assembly', () => {
    expect(() =>
      collectHandoffPayload(
        `beanconqueror://ADD_BREW?len=409601&shareBrew0=${'a'.repeat(409601)}`,
      ),
    ).toThrowError('Brew handoff len must be at most 409600 characters');
    expect(() =>
      collectHandoffPayload(
        `beanconqueror://ADD_BREW?len=409600&shareBrew0=${'a'.repeat(409601)}`,
      ),
    ).toThrowError('shareBrew0 must be at most 400 characters');
  });

  it('rejects a single chunk beyond the per-chunk budget', () => {
    expect(() =>
      collectHandoffPayload(
        `beanconqueror://ADD_BREW?len=401&shareBrew0=${'a'.repeat(401)}`,
      ),
    ).toThrowError('shareBrew0 must be at most 400 characters');
  });

  it('rejects assembled payload length mismatches', () => {
    const payload = 'a'.repeat(400);

    expect(() =>
      collectHandoffPayload(handoffUrl(payload, { len: 401 })),
    ).toThrowError(
      'Truncated brew handoff payload: expected 401 characters, got 400',
    );
    expect(() =>
      collectHandoffPayload(handoffUrl(payload, { len: 399 })),
    ).toThrowError(
      'Brew handoff payload length mismatch: expected 399 characters, got 400',
    );
  });

  it('rejects invalid base64url payloads', async () => {
    await expectAsync(decodeHandoffPayload('abc+=')).toBeRejectedWithError(
      'Payload is not unpadded base64url',
    );
    await expectAsync(decodeHandoffPayload('a')).toBeRejectedWithError(
      'Payload is not unpadded base64url',
    );
  });

  it('rejects bytes that are not gzip', async () => {
    await expectAsync(decodeHandoffPayload('SGVsbG8')).toBeRejectedWithError(
      'Payload is not gzip',
    );
  });

  it('falls back to zip.js gzip inflation when native decompression is unavailable', async () => {
    (
      window as unknown as { DecompressionStream?: typeof DecompressionStream }
    ).DecompressionStream = undefined;

    const decoded = await decodeHandoffPayload(
      await gzipBase64Url(validEnvelope()),
    );

    expect(decoded).toEqual(validEnvelope());
  });

  it('bounds zip.js fallback inflation when the gzip footer lies about size', async () => {
    (
      window as unknown as { DecompressionStream?: typeof DecompressionStream }
    ).DecompressionStream = undefined;
    const gzipped = await gzipRawBytes(
      new TextEncoder().encode(JSON.stringify({ note: 'x'.repeat(600000) })),
    );
    gzipped[gzipped.length - 4] = 1;
    gzipped[gzipped.length - 3] = 0;
    gzipped[gzipped.length - 2] = 0;
    gzipped[gzipped.length - 1] = 0;

    await expectAsync(
      decodeHandoffPayload(base64Url(gzipped)),
    ).toBeRejectedWithError('Inflated payload exceeds 524288 bytes');
  });

  it('rejects gzip that inflates past the cap', async () => {
    const payload = await gzipBase64Url({ note: 'x'.repeat(600000) });

    await expectAsync(decodeHandoffPayload(payload)).toBeRejectedWithError(
      'Inflated payload exceeds 524288 bytes',
    );
  });

  it('rejects gzip that inflates to invalid UTF-8', async () => {
    await expectAsync(
      decodeHandoffPayload(await gzipBytes(new Uint8Array([0xc3, 0x28]))),
    ).toBeRejectedWithError('Inflated payload is not UTF-8');
  });

  it('rejects gzip that inflates to non-JSON', async () => {
    await expectAsync(
      decodeHandoffPayload(await gzipString('not json')),
    ).toBeRejectedWithError('Inflated payload is not JSON');
  });

  it('rejects JSON that is not an object', async () => {
    await expectAsync(decodeEnvelope([])).toBeRejectedWithError(
      'Envelope must be an object',
    );
    await expectAsync(decodeEnvelope('text')).toBeRejectedWithError(
      'Envelope must be an object',
    );
    await expectAsync(decodeEnvelope(null)).toBeRejectedWithError(
      'Envelope must be an object',
    );
  });

  it('rejects unsupported envelope versions', async () => {
    await expectAsync(
      decodeEnvelope(validEnvelope({ v: 0 as IHandoffEnvelope['v'] })),
    ).toBeRejectedWithError('Unsupported envelope version 0');
    await expectAsync(
      decodeEnvelope(validEnvelope({ v: 1001 as IHandoffEnvelope['v'] })),
    ).toBeRejectedWithError('Unsupported envelope version 1001');
  });

  it('validates the app block and treats an empty version as absent', async () => {
    await expectAsync(
      decodeEnvelope({ ...validEnvelope(), app: undefined }),
    ).toBeRejectedWithError('Envelope app must be an object');
    await expectAsync(
      decodeEnvelope({ ...validEnvelope(), app: { name: '', version: '1.0' } }),
    ).toBeRejectedWithError('Envelope app.name must be a non-empty string');

    const decoded = await decodeEnvelope({
      ...validEnvelope(),
      app: { name: 'Sender', version: '' },
    });

    expect(decoded.app).toEqual({ name: 'Sender' });
  });

  it('rejects missing or malformed imported identity fields', async () => {
    await expectAsync(
      decodeEnvelope({ ...validEnvelope(), imported: undefined }),
    ).toBeRejectedWithError('Envelope imported must be an object');
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          imported: { source: '', sourceName: 'Sender', schema: 1 },
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope imported.source must be a non-empty string',
    );
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          imported: { source: 'sender', sourceName: '', schema: 1 },
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope imported.sourceName must be a non-empty string',
    );
  });

  it('normalises accepted source URLs and rejects non-https URLs', async () => {
    const leadingSpace = await decodeEnvelope(
      validEnvelope({
        imported: {
          source: 'sender',
          sourceName: 'Sender',
          sourceUrl: ' https://example.com',
          schema: 1,
        },
      }),
    );
    const mixedCase = await decodeEnvelope(
      validEnvelope({
        imported: {
          source: 'sender',
          sourceName: 'Sender',
          sourceUrl: 'HtTpS://example.com/Path',
          schema: 1,
        },
      }),
    );

    expect(leadingSpace.imported.sourceUrl).toBe('https://example.com/');
    expect(mixedCase.imported.sourceUrl).toBe('https://example.com/Path');
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          imported: {
            source: 'sender',
            sourceName: 'Sender',
            sourceUrl: 'javascript:alert(1)',
            schema: 1,
          },
        }),
      ),
    ).toBeRejectedWithError('Envelope imported.sourceUrl must be https');
  });

  it('rejects imported schema outside the supported bounds', async () => {
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          imported: { source: 'sender', sourceName: 'Sender', schema: 0 },
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope imported.schema must be between 1 and 1000',
    );
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          imported: { source: 'sender', sourceName: 'Sender', schema: 1001 },
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope imported.schema must be between 1 and 1000',
    );
  });

  it('sanitises prototype-pollution keys throughout opaque objects', async () => {
    const raw = JSON.stringify(validEnvelope())
      .replace(
        '"params":{"recipe":"abc123"}',
        '"params":{"__proto__":{"polluted":true},"a":{"__proto__":{"polluted":true},"b":{"c":{"__proto__":{"polluted":true}}}},"list":[{"__proto__":{"polluted":true},"safe":1}],"constructor":{"prototype":{"polluted":true}}}',
      )
      .replace(
        '"bean":{"name":"Any coffee"}',
        '"bean":{"name":"Any coffee","origin":{"__proto__":{"polluted":true},"safe":true}}',
      );

    const decoded = await decodeHandoffPayload(await gzipString(raw));

    expect(
      (Object.prototype as { polluted?: unknown }).polluted,
    ).toBeUndefined();
    expect(Object.getPrototypeOf(decoded.imported.params)).toBeNull();
    expect(decoded.imported.params).toEqual({
      a: { b: { c: {} } },
      list: [{ safe: 1 }],
    });
    expect(decoded.bean).toEqual({ name: 'Any coffee' });
  });

  it('drops malformed bean metadata without rejecting the brew', async () => {
    const decodedWrongTypes = await decodeEnvelope(
      validEnvelope({
        bean: {
          name: '  Pod coffee  ',
          origin: 123,
          process: '',
          variety: '  Heirloom  ',
          aromatics: false,
          note: '  Floral  ',
          beanMix: ' garbage ',
          imageUrl: [],
        } as unknown as IHandoffEnvelope['bean'],
      }),
    );
    const decodedMalformedBean = await decodeEnvelope(
      validEnvelope({
        bean: 'not a bean' as unknown as IHandoffEnvelope['bean'],
      }),
    );
    const decodedMissingName = await decodeEnvelope(
      validEnvelope({
        bean: {
          origin: 'Ethiopia',
        } as unknown as IHandoffEnvelope['bean'],
      }),
    );

    expect(decodedWrongTypes.bean).toEqual({
      name: 'Pod coffee',
      variety: 'Heirloom',
      note: 'Floral',
      beanMix: 'garbage',
    });
    expect(decodedMalformedBean.bean).toBeUndefined();
    expect(decodedMissingName.bean).toBeUndefined();
  });

  it('bounds opaque imported params depth and key count', async () => {
    let deep: Record<string, unknown> = { end: true };
    for (let i = 0; i < 9; i++) {
      deep = { child: deep };
    }

    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          imported: { ...validEnvelope().imported, params: deep },
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope imported.params.child.child.child.child.child.child.child.child.child exceeds maximum depth 8',
    );
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          imported: {
            ...validEnvelope().imported,
            params: Object.fromEntries(
              Array.from({ length: 1001 }, (_value, index) => [
                `k${index}`,
                true,
              ]),
            ),
          },
        }),
      ),
    ).toBeRejectedWithError('Envelope imported.params contains too many keys');
  });

  it('rejects non-object opaque blocks', async () => {
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          bean: 'Any coffee' as unknown as IHandoffEnvelope['bean'],
        }),
      ),
    ).toBeRejectedWithError('Envelope bean must be an object');
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          imported: {
            ...validEnvelope().imported,
            params: 'abc' as unknown as IHandoffEnvelope['imported']['params'],
          },
        }),
      ),
    ).toBeRejectedWithError('Envelope imported.params must be an object');
  });

  it('rejects a well-formed envelope with no brew', async () => {
    await expectAsync(
      decodeEnvelope({ ...validEnvelope(), brew: undefined }),
    ).toBeRejectedWithError('Envelope brew must be an object');
  });

  it('requires ISO 8601 brew dates', async () => {
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: { ...validEnvelope().brew, date: '12/25/2020' },
        }),
      ),
    ).toBeRejectedWithError('Envelope brew.date must be ISO 8601');
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: { ...validEnvelope().brew, date: 'Sat Jan 01 2022' },
        }),
      ),
    ).toBeRejectedWithError('Envelope brew.date must be ISO 8601');
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: { ...validEnvelope().brew, date: '2026-02-30T12:00:00Z' },
        }),
      ),
    ).toBeRejectedWithError('Envelope brew.date must be ISO 8601');
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: { ...validEnvelope().brew, date: '2025-02-29T12:00:00Z' },
        }),
      ),
    ).toBeRejectedWithError('Envelope brew.date must be ISO 8601');
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: { ...validEnvelope().brew, date: '2026-00-01T12:00:00Z' },
        }),
      ),
    ).toBeRejectedWithError('Envelope brew.date must be ISO 8601');
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: { ...validEnvelope().brew, date: '2026-13-01T12:00:00Z' },
        }),
      ),
    ).toBeRejectedWithError('Envelope brew.date must be ISO 8601');
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: { ...validEnvelope().brew, date: '2026-01-00T12:00:00Z' },
        }),
      ),
    ).toBeRejectedWithError('Envelope brew.date must be ISO 8601');

    const leapDay = await decodeEnvelope(
      validEnvelope({
        brew: { ...validEnvelope().brew, date: '2024-02-29T12:00:00Z' },
      }),
    );
    const validDate = await decodeEnvelope(
      validEnvelope({
        brew: { ...validEnvelope().brew, date: '2026-02-28T12:00:00Z' },
      }),
    );

    expect(leapDay.brew.date).toBe('2024-02-29T12:00:00Z');
    expect(validDate.brew.date).toBe('2026-02-28T12:00:00Z');
  });

  it('validates quantity units and resource-bounded brew fields', async () => {
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: {
            ...validEnvelope().brew,
            doseIn: { value: 18, unit: 'ml' as 'g' },
          },
        }),
      ),
    ).toBeRejectedWithError('Envelope brew.doseIn.unit must be g');
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: { ...validEnvelope().brew, doseIn: { value: 201, unit: 'g' } },
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope brew.doseIn.value must be between 0 and 200',
    );
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: {
            ...validEnvelope().brew,
            waterIn: { value: 100001, unit: 'ml' },
          },
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope brew.waterIn.value must be between 0 and 100000',
    );
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: {
            ...validEnvelope().brew,
            beverageOut: { value: 100001, unit: 'g' },
          },
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope brew.beverageOut.value must be between 0 and 100000',
    );
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: { ...validEnvelope().brew, brewTime: 86401 },
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope brew.brewTime must be between 0 and 86400',
    );
  });

  it('accepts widened plausible numeric brew fields', async () => {
    const decoded = await decodeEnvelope(
      validEnvelope({
        brew: {
          ...validEnvelope().brew,
          waterIn: { value: 12000, unit: 'ml' },
          beverageOut: { value: 11000, unit: 'g' },
          temperature: -1,
          ratio: 101,
          grinderRpm: 6000,
        },
      }),
    );

    expect(decoded.brew.temperature).toBe(-1);
    expect(decoded.brew.ratio).toBe(101);
    expect(decoded.brew.grinderRpm).toBe(6000);
  });

  it('accepts Fahrenheit-scale bare temperatures but still bounds accidents', async () => {
    const decoded = await decodeEnvelope(
      validEnvelope({
        brew: { ...validEnvelope().brew, temperature: 200 },
      }),
    );

    expect(decoded.brew.temperature).toBe(200);
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: { ...validEnvelope().brew, temperature: 251 },
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope brew.temperature must be between -50 and 250',
    );
  });

  it('carries a rating and leaves an unrated brew silent', async () => {
    const decoded = await decodeEnvelope(
      validEnvelope({ brew: { ...validEnvelope().brew, rating: 4 } }),
    );
    expect(decoded.brew.rating).toBe(4);

    const unrated = await decodeEnvelope(validEnvelope());
    expect(unrated.brew.rating).toBeUndefined();
  });

  it('refuses a rating that is not a whole number in range', async () => {
    await expectAsync(
      decodeEnvelope(
        validEnvelope({ brew: { ...validEnvelope().brew, rating: 3.5 } }),
      ),
    ).toBeRejectedWithError('Envelope brew.rating must be an integer');
    await expectAsync(
      decodeEnvelope(
        validEnvelope({ brew: { ...validEnvelope().brew, rating: 11 } }),
      ),
    ).toBeRejectedWithError('Envelope brew.rating must be between 0 and 10');
  });

  it('coerces empty optional strings to absent and defaults omitted note', async () => {
    const brewWithoutNote: Partial<IHandoffEnvelope['brew']> = {
      ...validEnvelope().brew,
    };
    delete brewWithoutNote.note;
    const decoded = await decodeEnvelope(
      validEnvelope({
        app: { name: 'Sender', version: '' },
        brew: {
          ...brewWithoutNote,
          grindSize: '',
          grinderName: '',
        } as IHandoffEnvelope['brew'],
        imported: {
          source: 'sender',
          sourceName: 'Sender',
          device: '',
          schema: 1,
        },
        metrics: [{ ...validEnvelope().metrics[0], unit: '' }],
      }),
    );

    expect(decoded.app.version).toBeUndefined();
    expect(decoded.brew.grindSize).toBeUndefined();
    expect(decoded.brew.grinderName).toBeUndefined();
    expect(decoded.brew.note).toBe('');
    expect(decoded.imported.device).toBeUndefined();
    expect(decoded.metrics[0].unit).toBe('');
  });

  it('keeps long but bounded labels and rejects labels beyond the cap', async () => {
    const longLabel = 'a'.repeat(512);
    const decoded = await decodeEnvelope(
      validEnvelope({
        brew: { ...validEnvelope().brew, preparationMethod: longLabel },
      }),
    );

    expect(decoded.brew.preparationMethod).toBe(longLabel);
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: {
            ...validEnvelope().brew,
            preparationMethod: 'a'.repeat(513),
          },
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope brew.preparationMethod must be between 1 and 512 characters',
    );
  });

  it('rejects notes beyond the resource cap', async () => {
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          brew: { ...validEnvelope().brew, note: 'a'.repeat(10001) },
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope brew.note must be between 0 and 10000 characters',
    );
  });

  it('rejects invalid flow fidelity and mismatched flow arrays', async () => {
    await expectAsync(
      decodeEnvelope({
        ...validEnvelope(),
        flow: {
          fidelity: 'preview',
          t: [0, 1000],
          waterDispensed: [0, 100],
          weight: [0, 50],
        },
      }),
    ).toBeRejectedWithError(
      'Envelope flow.fidelity must be full or downsampled',
    );
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          flow: {
            fidelity: 'full',
            t: [0, 1000],
            waterDispensed: [0],
            weight: [0, 50],
          },
        }),
      ),
    ).toBeRejectedWithError('Envelope flow arrays must have the same length');
  });

  it('rejects invalid flow numbers, too many points and backwards deltas', async () => {
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          flow: {
            fidelity: 'full',
            t: [0, Number.POSITIVE_INFINITY],
            waterDispensed: [0, 100],
            weight: [0, 50],
          },
        }),
      ),
    ).toBeRejectedWithError('Envelope flow.t[1] must be a finite number');
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          flow: {
            fidelity: 'full',
            t: [0, -1],
            waterDispensed: [0, 100],
            weight: [0, 50],
          },
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope flow.t[1] must be between 0 and 86400000',
    );
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          flow: {
            fidelity: 'full',
            t: Array.from({ length: 10001 }, () => 1),
            waterDispensed: Array.from({ length: 10001 }, () => 1),
            weight: Array.from({ length: 10001 }, () => 1),
          },
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope flow.t must contain at most 10000 entries',
    );
  });

  it('rejects invalid metric shape and bounds', async () => {
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          metrics: Array.from(
            { length: 101 },
            () => validEnvelope().metrics[0],
          ),
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope metrics must contain at most 100 entries',
    );
    await expectAsync(
      decodeEnvelope({
        ...validEnvelope(),
        metrics: [{ ...validEnvelope().metrics[0], kind: 'plan' }],
      }),
    ).toBeRejectedWithError(
      'Envelope metrics[0].kind must be target or measured',
    );
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          metrics: [{ ...validEnvelope().metrics[0], t: [0, 1], v: [93] }],
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope metrics[0] arrays must have the same length',
    );
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          metrics: [{ ...validEnvelope().metrics[0], t: [86400001], v: [93] }],
        }),
      ),
    ).toBeRejectedWithError(
      'Envelope metrics[0].t[0] must be between 0 and 86400000',
    );
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          metrics: [{ ...validEnvelope().metrics[0], key: '__proto__' }],
        }),
      ),
    ).toBeRejectedWithError('Envelope metrics[0].key is not allowed');
    await expectAsync(
      decodeEnvelope(
        validEnvelope({
          metrics: [
            validEnvelope().metrics[0],
            {
              ...validEnvelope().metrics[0],
              name: 'Same key again',
            },
          ],
        }),
      ),
    ).toBeRejectedWithError('Envelope metrics[1].key is duplicated');
  });

  it('decodes a valid envelope and round trips through real gzip', async () => {
    const envelope = validEnvelope();
    const payload = await gzipBase64Url(envelope);
    const collected = collectHandoffPayload(handoffUrl(payload));
    const decoded = await decodeHandoffPayload(collected);

    expect(decoded).toEqual(envelope);
  });
});
