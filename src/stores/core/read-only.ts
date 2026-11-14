import { isDevMode } from '@angular/core';

/** Read-only view of `T` at every depth. Functions keep their type. */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer E)[]
    ? readonly DeepReadonly<E>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

/**
 * A copy of `value` in which every object is a plain object and every array a
 * plain array, whatever class they were built with. Own enumerable fields are
 * kept, values are not serialized.
 */
export function toPlainData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => toPlainData<unknown>(item)) as T;
  }
  if (value !== null && typeof value === 'object') {
    const plain: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      plain[key] = toPlainData((value as Record<string, unknown>)[key]);
    }
    return plain as T;
  }
  return value;
}

/**
 * Store entries are read-only by type. In dev mode (unit tests, `ng serve`
 * and every build without the production configuration) they are frozen as
 * well, so that a write that got past the types throws instead of changing an
 * object many readers share. Returns `value` itself.
 */
export function freezeInDev<T>(value: T): DeepReadonly<T> {
  if (isDevMode()) {
    deepFreeze(value);
  }
  return value as DeepReadonly<T>;
}

function deepFreeze(value: unknown): void {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
}
