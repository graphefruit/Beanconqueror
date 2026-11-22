/**
 * Text as the bean search compares it: case and accents do not matter, so
 * "jose" finds "José" and "café" finds "Cafe". Letters without a decomposition
 * such as ß, ø, æ or ł stay as they are.
 */
export function foldSearchText(text: string): string {
  // Composing again keeps Hangul syllables and kana with voicing marks whole,
  // so a search does not match parts of them.
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC');
}
