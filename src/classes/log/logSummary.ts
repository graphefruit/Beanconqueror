/**
 * What the app log keeps of an error that can carry the answer of a server
 * or an address: its type and, when it has one, its HTTP status. The message
 * of such an error can quote the answer and with it account data or keys.
 */
export function errorSummary(error: unknown): string {
  const type = error instanceof Error ? error.name : typeof error;
  const status = (error as { status?: unknown } | null | undefined)?.status;
  return typeof status === 'number' ? `${type} (status ${status})` : type;
}

/** How much of a long text the app log keeps. */
export const LOG_TEXT_LENGTH = 100;

/**
 * What the app log keeps of a text the user captured or entered (a label, a
 * prompt, the answer of an AI): its start and its full length.
 */
export function textSummary(text: string): string {
  if (text.length <= LOG_TEXT_LENGTH) {
    return text;
  }
  return `${text.slice(0, LOG_TEXT_LENGTH)}… (${text.length} chars)`;
}
