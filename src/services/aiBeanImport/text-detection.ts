import type {
  Block,
  BoundingBox,
  Element,
  Line,
  TextDetectionResult,
} from '@beanconqueror/text-recognition';

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toBoundingBox(value: unknown): BoundingBox | null {
  if (!isRecord(value)) {
    return null;
  }
  const { left, top, right, bottom } = value;
  if (![left, top, right, bottom].every(Number.isFinite)) {
    return null;
  }
  return { left, top, right, bottom } as BoundingBox;
}

/**
 * Maps entries of a native list and drops those without a usable box, because
 * the layout classification divides by box heights.
 */
function mapWithBox<T>(
  value: unknown,
  build: (raw: Raw, boundingBox: BoundingBox) => T,
): T[] {
  return asArray(value).flatMap((raw) => {
    if (!isRecord(raw)) {
      return [];
    }
    const boundingBox = toBoundingBox(raw.boundingBox);
    return boundingBox ? [build(raw, boundingBox)] : [];
  });
}

function toElement(raw: Raw, boundingBox: BoundingBox): Element {
  return {
    text: asString(raw.text),
    boundingBox,
    recognizedLanguage: asString(raw.recognizedLanguage),
  };
}

function toLine(raw: Raw, boundingBox: BoundingBox): Line {
  return {
    ...toElement(raw, boundingBox),
    elements: mapWithBox(raw.elements, toElement),
  };
}

function toBlock(raw: Raw, boundingBox: BoundingBox): Block {
  return {
    ...toElement(raw, boundingBox),
    lines: mapWithBox(raw.lines, toLine),
  };
}

/**
 * Brings a native text recognition result into the shape the layout
 * classification expects; the full text is kept even when boxes are dropped.
 */
export function toTextDetectionResult(raw: unknown): TextDetectionResult {
  if (!isRecord(raw)) {
    return { text: '', blocks: [] };
  }
  return {
    text: asString(raw.text),
    blocks: mapWithBox(raw.blocks, toBlock),
  };
}
