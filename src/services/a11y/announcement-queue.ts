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
