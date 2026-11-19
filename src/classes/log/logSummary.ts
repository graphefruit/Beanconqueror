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
