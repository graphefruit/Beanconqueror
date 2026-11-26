import { BEAN_CODE_ACTION } from '../../enums/beans/beanCodeAction';
import {
  appLinkFromNdefMessage,
  beanCodeLink,
  INdefRecord,
  internalLinkFromNfcTagLink,
  nfcTagLink,
} from './nfc-tag-link';

const OLD_LINK = 'beanconqueror://int/bean/3E95E1/START_BREW';
const NEW_LINK = 'https://beanconqueror.com/app/int/bean/3E95E1/START_BREW';
const TAG_LINK = 'https://beanconqueror.com/app/nfc/#3E95E1/START_BREW';

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
      'a tag link as the app writes it',
      [uriRecord(4, TAG_LINK.slice(8))],
      TAG_LINK,
    ],
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

describe('nfcTagLink', () => {
  it('puts code and action into the fragment of the NFC page', () => {
    expect(nfcTagLink('3E95E1', 'START_BREW')).toBe(TAG_LINK);
  });
});

describe('internalLinkFromNfcTagLink', () => {
  const cases: [string, string, string | undefined][] = [
    ['a written tag link', TAG_LINK, OLD_LINK],
    [
      'a link with www, upper-case host and trailing slash',
      'https://WWW.beanconqueror.com/app/nfc/#3E95E1/DETAIL/',
      'beanconqueror://int/bean/3E95E1/DETAIL',
    ],
    [
      'a link without slash before the fragment',
      'https://beanconqueror.com/app/nfc#3E95E1/EDIT',
      'beanconqueror://int/bean/3E95E1/EDIT',
    ],
    ['an old text chip link', OLD_LINK, undefined],
    ['the former path link', NEW_LINK, undefined],
    [
      'the page without fragment',
      'https://beanconqueror.com/app/nfc/',
      undefined,
    ],
    [
      'a fragment without action',
      'https://beanconqueror.com/app/nfc/#3E95E1',
      undefined,
    ],
    [
      'a fragment with more parts',
      'https://beanconqueror.com/app/nfc/#3E95E1/DETAIL/x',
      undefined,
    ],
    [
      'a plain http link',
      'http://beanconqueror.com/app/nfc/#3E95E1/DETAIL',
      undefined,
    ],
    [
      'a look-alike host',
      'https://beanconqueror.com.example.com/app/nfc/#3E95E1/DETAIL',
      undefined,
    ],
    [
      'the NFC path on a foreign host',
      'https://example.com/app/nfc/#3E95E1/DETAIL',
      undefined,
    ],
  ];

  for (const [name, url, expected] of cases) {
    it(`reads ${name}`, () => {
      expect(internalLinkFromNfcTagLink(url)).toBe(expected);
    });
  }

  it('reads back what nfcTagLink writes for every action', () => {
    for (const action of Object.values(BEAN_CODE_ACTION)) {
      expect(internalLinkFromNfcTagLink(nfcTagLink('AB12CD', action))).toBe(
        `beanconqueror://int/bean/AB12CD/${action}`,
      );
    }
  });
});

describe('beanCodeLink', () => {
  const cases: [string, string, ReturnType<typeof beanCodeLink>][] = [
    [
      'an old chip',
      'beanconqueror://int/bean/3E95E1/START_BREW',
      { code: '3E95E1', action: BEAN_CODE_ACTION.START_BREW },
    ],
    [
      'a web link',
      'https://beanconqueror.com/app/int/bean/3E95E1/DETAIL',
      { code: '3E95E1', action: BEAN_CODE_ACTION.DETAIL },
    ],
    [
      'trailing bytes after the action',
      'beanconqueror://int/bean/3E95E1/CHOOSE_ACTION\u0000\n',
      { code: '3E95E1', action: BEAN_CODE_ACTION.CHOOSE_ACTION },
    ],
    ['an unknown action', 'beanconqueror://int/bean/3E95E1/BREW', undefined],
    ['a missing action', 'beanconqueror://int/bean/3E95E1', undefined],
    ['a missing code', 'beanconqueror://int/bean//DETAIL', undefined],
    ['another type', 'beanconqueror://int/mill/3E95E1/DETAIL', undefined],
  ];

  for (const [name, url, expected] of cases) {
    it(`reads ${name}`, () => {
      expect(beanCodeLink(url)).toEqual(expected);
    });
  }
});
