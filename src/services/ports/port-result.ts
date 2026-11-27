/** The outcome of a device call: a failure arrives as a value, never as an exception. */
export type PortResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };
