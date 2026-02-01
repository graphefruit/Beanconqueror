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

  // Track the response
  let latestSnapshot = '';
  let resolved = false;

  return new Promise<string>(async (resolve) => {
    const cleanup = async (textListener: any, finishedListener: any) => {
      try {
        await textListener?.remove();
        await finishedListener?.remove();
      } catch (e) {
        logger?.error('Error cleaning up listeners: ' + e);
      }
    };

    const resolveOnce = async (
      value: string,
      textListener: any,
      finishedListener: any,
    ) => {
      if (!resolved) {
        resolved = true;
        await cleanup(textListener, finishedListener);
        resolve(value);
      }
    };

    // Listen for text chunks
    const textListener = await CapgoLLM.addListener(
      'textFromAi',
      (event: any) => {
        if (event.text) {
          latestSnapshot = event.text;
        }
      },
    );

    // Listen for completion
    const finishedListener = await CapgoLLM.addListener(
      'aiFinished',
      async () => {
        await resolveOnce(latestSnapshot, textListener, finishedListener);
      },
    );

    // Timeout fallback
    setTimeout(async () => {
      if (!resolved) {
        logger?.log('LLM timeout, using latest snapshot');
        await resolveOnce(latestSnapshot || '', textListener, finishedListener);
      }
    }, timeoutMs);

    // Send message
    await CapgoLLM.sendMessage({
      chatId,
      message: prompt,
    });
  });
}
