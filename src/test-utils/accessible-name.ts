/**
 * The text a screen reader reads for `element`, with the parts hidden from it
 * left out and whitespace collapsed. Walks the DOM itself, because Ionic's
 * scoped components (ion-label) override textContent and childNodes once
 * they are defined.
 */
export function accessibleName(element: Element): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    if (!text.parentElement.closest('[aria-hidden="true"]')) {
      parts.push(text.nodeValue);
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}
