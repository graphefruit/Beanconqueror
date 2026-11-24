/** A message waiting to be spoken. */
export interface QueuedAnnouncement {
  /**
   * Marks a value that goes out of date, e.g. "weight" or "time". Messages
   * without one (toasts, status messages, brew start) are all spoken.
   */
  readonly key?: string;
}

/**
 * The messages waiting to be spoken once `next` is due. A value replaces the
 * value of the same key still waiting, so what is heard is never stale; every
 * other message keeps its turn.
 */
export function enqueueAnnouncement<T extends QueuedAnnouncement>(
  waiting: readonly T[],
  next: T,
): T[] {
  const kept =
    next.key === undefined
      ? waiting
      : waiting.filter(({ key }) => key !== next.key);
  return [...kept, next];
}

/**
 * Takes the message to speak next from `waiting`: the first one, unless it is
 * a value of the key spoken last (`lastKey`) and something else waits, which
 * then goes first. Values due at the same pace thus take turns instead of one
 * key always being newer when the voice is free. Returns the message and what
 * still waits.
 */
export function takeNextAnnouncement<T extends QueuedAnnouncement>(
  waiting: readonly T[],
  lastKey: string | undefined,
): [T, T[]] | undefined {
  if (waiting.length === 0) {
    return undefined;
  }
  const other =
    lastKey !== undefined && waiting[0].key === lastKey
      ? waiting.findIndex(({ key }) => key !== lastKey)
      : -1;
  const index = Math.max(0, other);
  return [waiting[index], waiting.filter((_, i) => i !== index)];
}
