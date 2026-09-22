/**
 * Brew handoff links are a trust boundary: the payload is attacker-controlled
 * gzip JSON and must be rejected before it can reach permanent brew records.
 */

import { BlobReader, ZipReader } from '@zip.js/zip.js';
import type { FileEntry } from '@zip.js/zip.js';

import type {
  IHandoffBean,
  IHandoffBrew,
  IHandoffEnvelope,
  IHandoffFlow,
  IHandoffImport,
  IHandoffMetric,
  IHandoffQuantity,
} from '../../interfaces/brew/IHandoff';

export type {
  IHandoffBrew,
  IHandoffBean,
  IHandoffEnvelope,
  IHandoffFlow,
  IHandoffImport,
  IHandoffMetric,
  IHandoffQuantity,
} from '../../interfaces/brew/IHandoff';

// A realistic 2,400-sample brew is roughly 60 KB JSON; 512 KiB is generous headroom for one brew while still being the cap that refuses zip bombs.
const MAX_INFLATED_BYTES = 512 * 1024;
// The sender's 131,072-character URL budget is the real limit: at 400 characters per slice it can emit 328 chunks. This 1,024-chunk backstop is 409,600 characters, so the receiver never becomes the binding constraint while assembly stays finite.
const MAX_CHUNKS = 1024;
const MAX_CHUNK_CHARS = 400;
const MAX_PAYLOAD_CHARS = MAX_CHUNKS * MAX_CHUNK_CHARS;
// Four times today's 2,400-sample trace is enough for long brews without letting arrays dominate the UI.
const MAX_SERIES_POINTS = 10_000;
// One day is far beyond a brew, but accepts paused/manual records without million-second accidents.
const MAX_SECONDS = 86_400;
// 200 g covers batch brewing; negative or larger values are not useful in a cup record.
const MAX_DOSE_G = 200;
// Big enough for urn-sized batches, small enough that one link cannot poison aggregate statistics.
const MAX_BREW_QUANTITY = 100_000;
// Temperature is schema-v1 bare Celsius; this range admits chilled brews and Fahrenheit senders without pretending to know their unit.
const MIN_TEMPERATURE = -50;
const MAX_TEMPERATURE = 250;
// Sender, device and metric names are labels; 512 chars fits unusually specific brewer/method names without UI-scale abuse.
const MAX_LABEL_LENGTH = 512;
// Notes are user-visible permanent text; 10,000 chars is generous without letting a link flood the form.
const MAX_NOTE_LENGTH = 10_000;
// A ceiling for the schema, not for this app: the sender states a rating on
// its own scale, and the import clamps it to whatever scale the user has set.
const MAX_RATING = 10;
// Metric count is metadata, not the trace; 100 named series is already far beyond a brew chart.
const MAX_METRICS = 100;
// Opaque blocks may be rendered or copied later; cap their shape before a future deep-merge or stringify sees them.
const MAX_OPAQUE_DEPTH = 8;
const MAX_OPAQUE_KEYS = 1_000;
const MAX_OPAQUE_STRING_LENGTH = 10_000;
const MAX_ABSOLUTE_MILLISECONDS = 24 * 60 * 60 * 1_000;

const FORBIDDEN_RECORD_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);
const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const ISO_DATE_PARTS =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

/** Concatenate the numbered params back into one base64url string. */
export function collectHandoffPayload(url: string): string {
  const query = url.split('?')[1];
  if (!query) {
    throw new Error('Missing brew handoff query');
  }

  const params = new URLSearchParams(query);
  const lenParam = params.get('len');
  if (lenParam === null || !/^[0-9]+$/.test(lenParam)) {
    throw new Error('Missing or malformed brew handoff len');
  }
  const expectedLength = Number(lenParam);
  if (!Number.isSafeInteger(expectedLength)) {
    throw new Error('Brew handoff len is too large');
  }
  if (expectedLength > MAX_PAYLOAD_CHARS) {
    throw new Error(
      `Brew handoff len must be at most ${MAX_PAYLOAD_CHARS} characters`,
    );
  }

  const chunkIndexes: number[] = [];
  params.forEach((_value, key) => {
    const match = /^shareBrew([0-9]+)$/.exec(key);
    if (match !== null) {
      chunkIndexes.push(Number(match[1]));
    }
  });
  if (chunkIndexes.length === 0) {
    throw new Error('Missing shareBrew chunks');
  }
  if (chunkIndexes.length > MAX_CHUNKS) {
    throw new Error(`Too many shareBrew chunks: maximum is ${MAX_CHUNKS}`);
  }

  const seenIndexes = new Set<number>();
  chunkIndexes.forEach((index) => {
    if (seenIndexes.has(index)) {
      throw new Error(`Duplicate shareBrew chunk ${index}`);
    }
    seenIndexes.add(index);
  });

  const uniqueIndexes = [...new Set(chunkIndexes)].sort((a, b) => a - b);
  for (let index = 0; index < uniqueIndexes.length; index++) {
    if (uniqueIndexes[index] !== index) {
      throw new Error(`Missing shareBrew chunk ${index}`);
    }
  }

  let payload = '';
  uniqueIndexes.forEach((index) => {
    const chunk = params.get(`shareBrew${index}`) ?? '';
    if (chunk.length > MAX_CHUNK_CHARS) {
      throw new Error(
        `shareBrew${index} must be at most ${MAX_CHUNK_CHARS} characters`,
      );
    }
    payload += chunk;
    if (payload.length > MAX_PAYLOAD_CHARS) {
      throw new Error(
        `Brew handoff payload must be at most ${MAX_PAYLOAD_CHARS} characters`,
      );
    }
  });

  if (payload.length !== expectedLength) {
    const prefix =
      payload.length < expectedLength
        ? 'Truncated brew handoff payload'
        : 'Brew handoff payload length mismatch';
    throw new Error(
      `${prefix}: expected ${expectedLength} characters, got ${payload.length}`,
    );
  }

  return payload;
}

function base64UrlToBytes(payload: string): Uint8Array {
  if (!payload) {
    throw new Error('Empty payload');
  }
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || payload.length % 4 === 1) {
    throw new Error('Payload is not unpadded base64url');
  }

  const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error('Payload is not unpadded base64url');
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function supportsNativeGzip(): boolean {
  try {
    return (
      typeof DecompressionStream !== 'undefined' &&
      Boolean(new DecompressionStream('gzip'))
    );
  } catch {
    return false;
  }
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  let inflated: Uint8Array;
  try {
    if (supportsNativeGzip()) {
      const stream = new Blob([bytes as BlobPart])
        .stream()
        .pipeThrough(new DecompressionStream('gzip'));
      inflated = await readCapped(stream);
    } else {
      inflated = await gunzipWithZipJs(bytes);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Inflated payload exceeds')
    ) {
      throw error;
    }
    throw new Error('Payload is not gzip');
  }
  return decodeUtf8(inflated);
}

async function gunzipWithZipJs(bytes: Uint8Array): Promise<Uint8Array> {
  const member = gzipMember(bytes);
  // GZIP ISIZE is attacker-controlled and only proves the honest case early; readZipEntryCapped is the bound that holds.
  if (member.inflatedSize > MAX_INFLATED_BYTES) {
    throw new Error(`Inflated payload exceeds ${MAX_INFLATED_BYTES} bytes`);
  }

  const zipReader = new ZipReader(new BlobReader(zipAroundDeflate(member)));
  try {
    const entry = (await zipReader.getEntries()).shift();
    if (!entry || entry.directory === true) {
      throw new Error('Payload is not gzip');
    }
    return await readZipEntryCapped(entry as FileEntry, member.inflatedSize);
  } finally {
    await zipReader.close();
  }
}

async function readZipEntryCapped(
  entry: FileEntry,
  expectedInflatedSize: number,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      total += chunk.length;
      if (total > MAX_INFLATED_BYTES) {
        throw new Error(`Inflated payload exceeds ${MAX_INFLATED_BYTES} bytes`);
      }
      chunks.push(chunk);
    },
  });

  try {
    await entry.getData(writable, { checkSignature: true });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Invalid uncompressed size' &&
      total >= MAX_INFLATED_BYTES &&
      total !== expectedInflatedSize
    ) {
      throw new Error(`Inflated payload exceeds ${MAX_INFLATED_BYTES} bytes`);
    }
    if (
      !(error instanceof Error) ||
      error.message !== 'Invalid uncompressed size' ||
      total !== expectedInflatedSize
    ) {
      throw error;
    }
  }

  const out = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, offset);
    offset += chunk.length;
  });
  return out;
}

function gzipMember(bytes: Uint8Array): {
  deflate: Uint8Array;
  crc32: number;
  inflatedSize: number;
} {
  if (
    bytes.length < 18 ||
    bytes[0] !== 0x1f ||
    bytes[1] !== 0x8b ||
    bytes[2] !== 8 ||
    (bytes[3] & 0xe0) !== 0
  ) {
    throw new Error('Payload is not gzip');
  }

  let offset = 10;
  if (bytes[3] & 0x04) {
    if (offset + 2 > bytes.length - 8) {
      throw new Error('Payload is not gzip');
    }
    const extraLength = readUInt16LE(bytes, offset);
    offset += 2 + extraLength;
  }
  if (bytes[3] & 0x08) {
    offset = skipZeroTerminated(bytes, offset);
  }
  if (bytes[3] & 0x10) {
    offset = skipZeroTerminated(bytes, offset);
  }
  if (bytes[3] & 0x02) {
    offset += 2;
  }
  if (offset > bytes.length - 8) {
    throw new Error('Payload is not gzip');
  }

  return {
    deflate: bytes.subarray(offset, bytes.length - 8),
    crc32: readUInt32LE(bytes, bytes.length - 8),
    inflatedSize: readUInt32LE(bytes, bytes.length - 4),
  };
}

function skipZeroTerminated(bytes: Uint8Array, offset: number): number {
  while (offset < bytes.length - 8) {
    if (bytes[offset] === 0) {
      return offset + 1;
    }
    offset++;
  }
  throw new Error('Payload is not gzip');
}

function zipAroundDeflate(member: {
  deflate: Uint8Array;
  crc32: number;
}): Blob {
  const filename = new TextEncoder().encode('payload.json');
  const centralDirectoryOffset = 30 + filename.length + member.deflate.length;
  const centralDirectorySize = 46 + filename.length;
  const zip = new Uint8Array(
    centralDirectoryOffset + centralDirectorySize + 22,
  );
  let offset = 0;

  offset = writeZipHeader(zip, offset, 0x04034b50, 30, filename, member, 0);
  zip.set(member.deflate, offset);
  offset += member.deflate.length;
  offset = writeZipHeader(zip, offset, 0x02014b50, 46, filename, member, 0);

  writeUInt32LE(zip, offset, 0x06054b50);
  writeUInt16LE(zip, offset + 8, 1);
  writeUInt16LE(zip, offset + 10, 1);
  writeUInt32LE(zip, offset + 12, centralDirectorySize);
  writeUInt32LE(zip, offset + 16, centralDirectoryOffset);

  return new Blob([zip as BlobPart], { type: 'application/zip' });
}

function writeZipHeader(
  zip: Uint8Array,
  offset: number,
  signature: number,
  headerSize: 30 | 46,
  filename: Uint8Array,
  member: { deflate: Uint8Array; crc32: number },
  localHeaderOffset: number,
): number {
  writeUInt32LE(zip, offset, signature);
  if (headerSize === 46) {
    writeUInt16LE(zip, offset + 4, 20);
    writeUInt16LE(zip, offset + 6, 20);
    writeUInt16LE(zip, offset + 28, filename.length);
    writeUInt32LE(zip, offset + 42, localHeaderOffset);
  } else {
    writeUInt16LE(zip, offset + 4, 20);
    writeUInt16LE(zip, offset + 26, filename.length);
  }
  const base = headerSize === 46 ? offset + 8 : offset + 6;
  writeUInt16LE(zip, base + 2, 8);
  writeUInt32LE(zip, base + 8, member.crc32);
  writeUInt32LE(zip, base + 12, member.deflate.length);
  // Use our own limit as the ZIP size hint, not GZIP ISIZE, so a forged small footer cannot make zip.js fail before the bounded writer sees the overflow.
  writeUInt32LE(zip, base + 16, MAX_INFLATED_BYTES + 1);
  zip.set(filename, offset + headerSize);
  return offset + headerSize + filename.length;
}

function readUInt16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUInt32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function writeUInt16LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUInt32LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

async function readCapped(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.length;
    if (total > MAX_INFLATED_BYTES) {
      await reader.cancel();
      throw new Error(`Inflated payload exceeds ${MAX_INFLATED_BYTES} bytes`);
    }
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, offset);
    offset += chunk.length;
  });
  return out;
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('Inflated payload is not UTF-8');
  }
}

export async function decodeHandoffPayload(
  payload: string,
): Promise<IHandoffEnvelope> {
  const json = await gunzip(base64UrlToBytes(payload));
  let envelope: unknown;
  try {
    envelope = JSON.parse(json);
  } catch {
    throw new Error('Inflated payload is not JSON');
  }

  return validateEnvelope(envelope);
}

function validateEnvelope(value: unknown): IHandoffEnvelope {
  const envelope = objectRecord(value, 'Envelope');
  const version = envelope.v;
  if (version !== 1) {
    const shown =
      typeof version === 'string' ||
      typeof version === 'number' ||
      typeof version === 'boolean'
        ? String(version)
        : typeof version;
    throw new Error(`Unsupported envelope version ${shown}`);
  }

  return {
    v: 1,
    app: validateApp(envelope.app),
    brew: validateBrew(envelope.brew),
    ...optionalValue('bean', validateBean(envelope.bean)),
    ...optional(envelope.flow, 'flow', validateFlow),
    ...optional(envelope.metrics, 'metrics', validateMetrics),
    imported: validateImported(envelope.imported),
  };
}

function validateApp(value: unknown): IHandoffEnvelope['app'] {
  const app = objectRecord(value, 'Envelope app');
  return {
    name: boundedString(app.name, 'Envelope app.name', 1, MAX_LABEL_LENGTH),
    ...optionalString(app.version, 'version', 'Envelope app.version'),
  };
}

function validateBean(value: unknown): IHandoffBean | undefined {
  if (value === undefined) {
    return undefined;
  }

  // A present but non-object bean is a malformed envelope rather than an
  // absent one, and is rejected like every other shape error here. Swallowing
  // it would import the brew with no coffee attached and say nothing.
  const bean = objectRecord(value, 'Envelope bean');

  const name = optionalTrimmedString(
    bean.name,
    'Envelope bean.name',
    MAX_LABEL_LENGTH,
  );
  if (name === undefined) {
    return undefined;
  }

  const out: IHandoffBean = { name };
  const optionalFields: (keyof Omit<IHandoffBean, 'name'>)[] = [
    'origin',
    'process',
    'variety',
    'aromatics',
    'note',
    'beanMix',
    'imageUrl',
  ];
  optionalFields.forEach((field) => {
    const max =
      field === 'aromatics' || field === 'note'
        ? MAX_NOTE_LENGTH
        : MAX_LABEL_LENGTH;
    const fieldValue = optionalTrimmedString(
      bean[field],
      `Envelope bean.${field}`,
      max,
    );
    if (fieldValue !== undefined) {
      out[field] = fieldValue;
    }
  });
  return out;
}

function validateImported(value: unknown): IHandoffImport {
  const imported = objectRecord(value, 'Envelope imported');
  return {
    source: boundedString(
      imported.source,
      'Envelope imported.source',
      1,
      MAX_LABEL_LENGTH,
    ),
    sourceName: boundedString(
      imported.sourceName,
      'Envelope imported.sourceName',
      1,
      MAX_LABEL_LENGTH,
    ),
    ...optional(imported.sourceUrl, 'sourceUrl', validateSourceUrl),
    ...optionalString(imported.device, 'device', 'Envelope imported.device'),
    schema: boundedInteger(
      imported.schema,
      'Envelope imported.schema',
      1,
      1_000,
    ),
    ...optional(imported.params, 'params', (params) =>
      sanitizeOpaqueObject(params, 'Envelope imported.params'),
    ),
  };
}

function validateSourceUrl(value: unknown): string {
  const sourceUrl = boundedString(
    value,
    'Envelope imported.sourceUrl',
    1,
    2_048,
  );
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error('Envelope imported.sourceUrl must be a URL');
  }
  // Rejecting the whole envelope keeps a crafted action URL from being silently laundered into a trusted brew.
  if (parsed.protocol !== 'https:') {
    throw new Error('Envelope imported.sourceUrl must be https');
  }
  return parsed.href;
}

function validateBrew(value: unknown): IHandoffBrew {
  const brew = objectRecord(value, 'Envelope brew');
  return {
    date: isoDateString(brew.date, 'Envelope brew.date'),
    ...optional(brew.doseIn, 'doseIn', (doseIn) =>
      quantity(doseIn, 'g', 'Envelope brew.doseIn', 0, MAX_DOSE_G),
    ),
    waterIn: quantity(
      brew.waterIn,
      'ml',
      'Envelope brew.waterIn',
      0,
      MAX_BREW_QUANTITY,
    ),
    beverageOut: quantity(
      brew.beverageOut,
      'g',
      'Envelope brew.beverageOut',
      0,
      MAX_BREW_QUANTITY,
    ),
    brewTime: boundedNumber(
      brew.brewTime,
      'Envelope brew.brewTime',
      0,
      MAX_SECONDS,
    ),
    ...optional(brew.temperature, 'temperature', (temperature) =>
      boundedNumber(
        temperature,
        'Envelope brew.temperature',
        MIN_TEMPERATURE,
        MAX_TEMPERATURE,
      ),
    ),
    ...optional(brew.ratio, 'ratio', (ratio) =>
      nonNegativeNumber(ratio, 'Envelope brew.ratio'),
    ),
    ...optionalString(brew.grindSize, 'grindSize', 'Envelope brew.grindSize'),
    ...optional(brew.grinderRpm, 'grinderRpm', (grinderRpm) =>
      nonNegativeNumber(grinderRpm, 'Envelope brew.grinderRpm'),
    ),
    ...optionalString(
      brew.grinderName,
      'grinderName',
      'Envelope brew.grinderName',
    ),
    preparationMethod: boundedString(
      brew.preparationMethod,
      'Envelope brew.preparationMethod',
      1,
      MAX_LABEL_LENGTH,
    ),
    ...optional(brew.bloomTime, 'bloomTime', (bloomTime) =>
      boundedNumber(bloomTime, 'Envelope brew.bloomTime', 0, MAX_SECONDS),
    ),
    ...optional(brew.firstDripTime, 'firstDripTime', (firstDripTime) =>
      boundedNumber(
        firstDripTime,
        'Envelope brew.firstDripTime',
        0,
        MAX_SECONDS,
      ),
    ),
    ...optional(brew.rating, 'rating', (rating) =>
      boundedInteger(rating, 'Envelope brew.rating', 0, MAX_RATING),
    ),
    note:
      brew.note === undefined
        ? ''
        : boundedString(brew.note, 'Envelope brew.note', 0, MAX_NOTE_LENGTH),
  };
}

function validateFlow(value: unknown): IHandoffFlow {
  const flow = objectRecord(value, 'Envelope flow');
  if (flow.fidelity !== 'full' && flow.fidelity !== 'downsampled') {
    throw new Error('Envelope flow.fidelity must be full or downsampled');
  }

  const t = numberArray(
    flow.t,
    'Envelope flow.t',
    0,
    MAX_ABSOLUTE_MILLISECONDS,
  );
  const waterDispensed = numberArray(
    flow.waterDispensed,
    'Envelope flow.waterDispensed',
  );
  const weight = numberArray(flow.weight, 'Envelope flow.weight');
  const temperature =
    flow.temperature === undefined
      ? undefined
      : numberArray(flow.temperature, 'Envelope flow.temperature');

  if (
    waterDispensed.length !== t.length ||
    weight.length !== t.length ||
    (temperature !== undefined && temperature.length !== t.length)
  ) {
    throw new Error('Envelope flow arrays must have the same length');
  }

  return {
    fidelity: flow.fidelity,
    t,
    waterDispensed,
    weight,
    ...optionalValue('temperature', temperature),
  };
}

function validateMetrics(value: unknown): IHandoffMetric[] {
  if (!Array.isArray(value)) {
    throw new Error('Envelope metrics must be an array');
  }
  if (value.length > MAX_METRICS) {
    throw new Error(
      `Envelope metrics must contain at most ${MAX_METRICS} entries`,
    );
  }
  const metrics = value.map((metric, index) => validateMetric(metric, index));
  const keys = new Set<string>();
  metrics.forEach((metric, index) => {
    if (keys.has(metric.key)) {
      throw new Error(`Envelope metrics[${index}].key is duplicated`);
    }
    keys.add(metric.key);
  });
  return metrics;
}

function validateMetric(value: unknown, index: number): IHandoffMetric {
  const metric = objectRecord(value, `Envelope metrics[${index}]`);
  if (metric.kind !== 'target' && metric.kind !== 'measured') {
    throw new Error(
      `Envelope metrics[${index}].kind must be target or measured`,
    );
  }

  const t = numberArray(
    metric.t,
    `Envelope metrics[${index}].t`,
    0,
    MAX_ABSOLUTE_MILLISECONDS,
  );
  const v = numberArray(metric.v, `Envelope metrics[${index}].v`);
  if (t.length !== v.length) {
    throw new Error(
      `Envelope metrics[${index}] arrays must have the same length`,
    );
  }

  const key = boundedString(
    metric.key,
    `Envelope metrics[${index}].key`,
    1,
    MAX_LABEL_LENGTH,
  );
  if (FORBIDDEN_RECORD_KEYS.has(key)) {
    throw new Error(`Envelope metrics[${index}].key is not allowed`);
  }

  return {
    key,
    name: boundedString(
      metric.name,
      `Envelope metrics[${index}].name`,
      1,
      MAX_LABEL_LENGTH,
    ),
    unit: boundedString(
      metric.unit,
      `Envelope metrics[${index}].unit`,
      0,
      MAX_LABEL_LENGTH,
    ),
    kind: metric.kind,
    t,
    v,
  };
}

function quantity<Unit extends string>(
  value: unknown,
  unit: Unit,
  path: string,
  min: number,
  max: number,
): IHandoffQuantity<Unit> {
  const quantityValue = objectRecord(value, path);
  if (quantityValue.unit !== unit) {
    throw new Error(`${path}.unit must be ${unit}`);
  }
  return {
    value: boundedNumber(quantityValue.value, `${path}.value`, min, max),
    unit,
  };
}

function objectRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function sanitizeOpaqueObject(
  value: unknown,
  path: string,
): Record<string, unknown> {
  return sanitizeOpaqueValue(objectRecord(value, path), path, 0) as Record<
    string,
    unknown
  >;
}

function sanitizeOpaqueValue(
  value: unknown,
  path: string,
  depth: number,
): unknown {
  if (depth > MAX_OPAQUE_DEPTH) {
    throw new Error(`${path} exceeds maximum depth ${MAX_OPAQUE_DEPTH}`);
  }
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return value;
  }
  if (typeof value === 'string') {
    return boundedString(value, path, 0, MAX_OPAQUE_STRING_LENGTH);
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_OPAQUE_KEYS) {
      throw new Error(`${path} contains too many entries`);
    }
    return value.map((entry, index) =>
      sanitizeOpaqueValue(entry, `${path}[${index}]`, depth + 1),
    );
  }
  const record = objectRecord(value, path);
  const out: Record<string, unknown> = Object.create(null);
  const keys = Object.keys(record);
  if (keys.length > MAX_OPAQUE_KEYS) {
    throw new Error(`${path} contains too many keys`);
  }
  keys.forEach((key) => {
    if (FORBIDDEN_RECORD_KEYS.has(key)) {
      return;
    }
    boundedString(key, `${path} key`, 1, MAX_LABEL_LENGTH);
    out[key] = sanitizeOpaqueValue(record[key], `${path}.${key}`, depth + 1);
  });
  return out;
}

function boundedString(
  value: unknown,
  path: string,
  min: number,
  max: number,
): string {
  if (typeof value !== 'string') {
    throw new Error(`${path} must be a string`);
  }
  if (min > 0 && value.length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  if (value.length < min || value.length > max) {
    throw new Error(`${path} must be between ${min} and ${max} characters`);
  }
  return value;
}

function isoDateString(value: unknown, path: string): string {
  const date = boundedString(value, path, 1, MAX_LABEL_LENGTH);
  const match = ISO_DATE_PARTS.exec(date);
  if (
    !ISO_DATE.test(date) ||
    match === null ||
    !isValidCalendarDate(match[1], match[2], match[3]) ||
    !Number.isFinite(Date.parse(date))
  ) {
    throw new Error(`${path} must be ISO 8601`);
  }
  return date;
}

function isValidCalendarDate(
  yearText: string,
  monthText: string,
  dayText: string,
): boolean {
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day <= daysInMonth[month - 1];
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function boundedInteger(
  value: unknown,
  path: string,
  min: number,
  max: number,
): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${path} must be an integer`);
  }
  return boundedNumber(value, path, min, max);
}

function nonNegativeNumber(value: unknown, path: string): number {
  return boundedNumber(value, path, 0, Number.MAX_SAFE_INTEGER);
}

function boundedNumber(
  value: unknown,
  path: string,
  min = -Number.MAX_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`);
  }
  if (value < min || value > max) {
    throw new Error(`${path} must be between ${min} and ${max}`);
  }
  return value;
}

function numberArray(
  value: unknown,
  path: string,
  min = -Number.MAX_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
): number[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }
  if (value.length > MAX_SERIES_POINTS) {
    throw new Error(
      `${path} must contain at most ${MAX_SERIES_POINTS} entries`,
    );
  }
  return value.map((entry, index) =>
    boundedNumber(entry, `${path}[${index}]`, min, max),
  );
}

function optional<K extends string, T>(
  value: unknown,
  key: K,
  validator: (value: unknown) => T,
): Partial<Record<K, T>> {
  return value === undefined
    ? {}
    : ({ [key]: validator(value) } as Partial<Record<K, T>>);
}

function optionalString<K extends string>(
  value: unknown,
  key: K,
  path: string,
): Partial<Record<K, string>> {
  if (value === undefined || value === '') {
    return {};
  }
  return { [key]: boundedString(value, path, 1, MAX_LABEL_LENGTH) } as Partial<
    Record<K, string>
  >;
}

function optionalTrimmedString(
  value: unknown,
  path: string,
  max: number,
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : boundedString(trimmed, path, 1, max);
}

function optionalValue<K extends string, T>(
  key: K,
  value: T | undefined,
): Partial<Record<K, T>> {
  return value === undefined ? {} : ({ [key]: value } as Partial<Record<K, T>>);
}
