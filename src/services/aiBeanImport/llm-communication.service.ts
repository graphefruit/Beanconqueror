import { CapgoLLM } from '@capgo/capacitor-llm';

export interface LLMCommunicationOptions {
  /** Timeout in milliseconds (default: 15000) */
  timeoutMs?: number;
  /** Logger instance for error reporting */
  logger?: { error: (msg: string) => void; log: (msg: string) => void };
}

/**
 * Null-like values that LLMs return when a field is not found.
 * Comparison is case-insensitive.
 */
const NULL_LIKE_VALUES = new Set([
  'null',
  'not_found',
  'unknown',
  'none',
  'n/a',
  '',
]);

/**
 * Check if an LLM response value represents "not found" / null.
 *
 * @param value The value to check
 * @returns true if the value is null-like
 */
export function isNullLikeValue(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== 'string') return false;
  return NULL_LIKE_VALUES.has(value.trim().toLowerCase());
}

/**
 * Extract JSON from an LLM response that may contain markdown code blocks.
 *
 * @param response Raw LLM response text
 * @returns Parsed JSON object, or null if parsing fails
 */
export function extractJsonFromResponse<T = unknown>(
  response: string,
): T | null {
  try {
    let jsonStr = response.trim();

    // Extract JSON from markdown code blocks if present
    const jsonMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(jsonStr);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

/**
 * Send a prompt to the LLM and return the response.
 * Handles model setup, chat creation, listeners, timeout, and cleanup.
 *
 * @param prompt The prompt to send
 * @param options Configuration options
 * @returns The LLM response text, or empty string on timeout/error
 */
export async function sendLLMPrompt(
  prompt: string,
  options: LLMCommunicationOptions = {},
): Promise<string> {
  const { timeoutMs = 15000, logger } = options;

  // Set up Apple Intelligence model
  await CapgoLLM.setModel({ path: 'Apple Intelligence' });

  // Create chat session
  const { id: chatId } = await CapgoLLM.createChat();

  // Track the response and listeners
  let latestSnapshot = '';
  let resolved = false;
  let textListener: any;
  let finishedListener: any;

  const cleanup = async () => {
    try {
      await textListener?.remove();
      await finishedListener?.remove();
    } catch (e) {
      logger?.error('Error cleaning up listeners: ' + e);
    }
  };

  // Create promise first so resolvePromise is available for listeners
  let resolvePromise!: (value: string) => void;
  const responsePromise = new Promise<string>((resolve) => {
    resolvePromise = resolve;
  });

  const resolveOnce = (value: string) => {
    if (!resolved) {
      resolved = true;
      void cleanup();
      resolvePromise(value);
    }
  };

  // Set up listeners
  textListener = await CapgoLLM.addListener('textFromAi', (event: any) => {
    if (event.text) {
      latestSnapshot = event.text;
    }
  });

  finishedListener = await CapgoLLM.addListener('aiFinished', () => {
    resolveOnce(latestSnapshot);
  });

  // Timeout fallback
  setTimeout(() => {
    if (!resolved) {
      logger?.log('LLM timeout, using latest snapshot');
      resolveOnce(latestSnapshot || '');
    }
  }, timeoutMs);

  // Send message (don't await - let the promise handle completion)
  void CapgoLLM.sendMessage({
    chatId,
    message: prompt,
  });

  return responsePromise;
}
