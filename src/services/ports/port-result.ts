/** The outcome of a device call: a failure arrives as a value, never as an exception. */
export type PortResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

/** The text of a plugin failure; Cordova plugins fail with plain text as well as with errors. */
export function messageOf(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  return (
    (error as { message?: string } | undefined)?.message ?? 'Unknown error'
  );
}
