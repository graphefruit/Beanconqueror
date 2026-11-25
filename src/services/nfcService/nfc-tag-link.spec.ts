import { appLinkFromNdefMessage, INdefRecord } from './nfc-tag-link';

const OLD_LINK = 'beanconqueror://int/bean/3E95E1/START_BREW';
const NEW_LINK = 'https://beanconqueror.com/app/int/bean/3E95E1/START_BREW';

const bytes = (text: string) => Array.from(new TextEncoder().encode(text));
// Android hands bytes over signed, as Java does.
const signed = (values: number[]) => values.map((b) => (b > 127 ? b - 256 : b));

function textRecord(text: string, language = 'en'): INdefRecord {
  return {
    tnf: 1,
    type: [0x54],
    payload: [language.length, ...bytes(language), ...bytes(text)],
  };
}

function uriRecord(prefixCode: number, rest: string): INdefRecord {
  return { tnf: 1, type: [0x55], payload: [prefixCode, ...bytes(rest)] };
}

describe('appLinkFromNdefMessage', () => {
  const cases: [string, INdefRecord[] | undefined, string | undefined][] = [
    ['an old text chip', [textRecord(OLD_LINK)], OLD_LINK],
    [
      'a text chip with a longer language code',
      [textRecord(OLD_LINK, 'de-DE')],
      OLD_LINK,
    ],
    [
      'a URI record with the https:// prefix code',
      [uriRecord(4, NEW_LINK.slice(8))],
      NEW_LINK,
    ],
    ['a URI record without prefix code', [uriRecord(0, NEW_LINK)], NEW_LINK],
    [
      'a URI record with the https://www. prefix code',
      [uriRecord(2, 'beanconqueror.com/app/int/bean/3E95E1/DETAIL')],
      'https://www.beanconqueror.com/app/int/bean/3E95E1/DETAIL',
    ],
    [
      'a URI record with an app scheme link',
      [uriRecord(0, OLD_LINK)],
      OLD_LINK,
    ],
    [
      'the first app link after foreign records',
      [
        uriRecord(4, 'example.com/x'),
        textRecord('hello'),
        uriRecord(4, NEW_LINK.slice(8)),
      ],
      NEW_LINK,
    ],
    [
      'signed bytes from Android',
      [
        {
          ...textRecord('beanconqueror://int/bean/Ä1/DETAIL'),
          payload: signed(
            textRecord('beanconqueror://int/bean/Ä1/DETAIL')
              .payload as number[],
          ),
        },
      ],
      'beanconqueror://int/bean/Ä1/DETAIL',
    ],
    ['no message', undefined, undefined],
    ['an empty message', [], undefined],
    [
      'a record without payload',
      [{ tnf: 1, type: [0x54], payload: [] }],
      undefined,
    ],
    ['a broken record', [{}, null], undefined],
    [
      'a foreign web link',
      [uriRecord(4, 'example.com/int/bean/1/DETAIL')],
      undefined,
    ],
    [
      'a look-alike host',
      [uriRecord(4, 'beanconqueror.com.example.com/app')],
      undefined,
    ],
    ['plain text', [textRecord('my coffee')], undefined],
    [
      'a UTF-16 text record',
      [
        {
          ...textRecord(OLD_LINK),
          payload: [0x82, ...bytes('en'), ...bytes(OLD_LINK)],
        },
      ],
      undefined,
    ],
    [
      'a MIME record with the link',
      [{ tnf: 2, type: bytes('text/plain'), payload: bytes(OLD_LINK) }],
      undefined,
    ],
    [
      'a smart poster',
      [{ tnf: 1, type: bytes('Sp'), payload: bytes(OLD_LINK) }],
      undefined,
    ],
    [
      'an unknown well-known type',
      [{ tnf: 1, type: [0x58], payload: bytes(OLD_LINK) }],
      undefined,
    ],
  ];

  for (const [name, records, expected] of cases) {
    it(`reads ${name}`, () => {
      expect(appLinkFromNdefMessage(records)).toBe(expected);
    });
  }
});
