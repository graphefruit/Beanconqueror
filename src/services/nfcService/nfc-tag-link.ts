/** An NDEF record as the NFC plugin hands it over; Android sends signed bytes. */
export interface INdefRecord {
  tnf?: number;
  type?: ArrayLike<number>;
  payload?: ArrayLike<number>;
}

const TNF_WELL_KNOWN = 0x01;
const RTD_TEXT = 0x54;
const RTD_URI = 0x55;
const UTF16_FLAG = 0x80;
const LANGUAGE_LENGTH_MASK = 0x3f;
// NFC Forum URI prefix codes; any other code can only start a link that is not ours.
const URI_PREFIXES = ['', 'http://www.', 'https://www.', 'http://', 'https://'];
const APP_LINK =
  /^(beanconqueror:\/\/|https:\/\/(www\.)?beanconqueror\.com[/?])/i;

/**
 * The first Beanconqueror link on a tag: older chips carry it in a text record,
 * newer ones in a URI record. Undefined for empty, broken or foreign tags.
 */
export function appLinkFromNdefMessage(
  records: readonly INdefRecord[] | undefined,
): string | undefined {
  for (const record of records ?? []) {
    const content = decodeRecord(record);
    if (content !== undefined && APP_LINK.test(content)) {
      return content;
    }
  }
  return undefined;
}

function decodeRecord(record: INdefRecord): string | undefined {
  if (
    record?.tnf !== TNF_WELL_KNOWN ||
    record.type?.length !== 1 ||
    !record.payload?.length
  ) {
    return undefined;
  }
  const bytes = Uint8Array.from(record.payload);
  switch (record.type[0]) {
    case RTD_TEXT:
      if (bytes[0] & UTF16_FLAG) {
        return undefined;
      }
      return utf8(bytes.subarray(1 + (bytes[0] & LANGUAGE_LENGTH_MASK)));
    case RTD_URI:
      return (URI_PREFIXES[bytes[0]] ?? '') + utf8(bytes.subarray(1));
    default:
      return undefined;
  }
}

function utf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
