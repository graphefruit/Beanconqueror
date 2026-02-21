import { CapgoLLM } from '@capgo/capacitor-llm';

/**
 * Local type extension — the native Swift plugin already supports `instructions`
 * in `createChat()`, but the published TypeScript types don't expose the
 * parameter yet. Cast through `unknown` to avoid `any` while preserving full
 * type safety for every call-site in this file.
 */
interface LLMPluginWithInstructions {
  setModel(options: { path: string }): Promise<void>;
  createChat(options?: { instructions?: string }): Promise<{ id: string }>;
  sendMessage(options: {
    chatId: string;
    message: string;
  }): Promise<{ message: string }>;
  deleteChat(options: { chatId: string }): Promise<void>;
  addListener(
    eventName: string,
    callback: (event: { text?: string }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

const LLM = CapgoLLM as unknown as LLMPluginWithInstructions;

export interface LLMCommunicationOptions {
  /** Timeout in milliseconds (default: 15000) */
  timeoutMs?: number;
  /** System-level instructions passed to the LLM session (higher priority than prompt content) */
  instructions?: string;
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
  const { timeoutMs = 15000, instructions, logger } = options;

  // Set up Apple Intelligence model
  await LLM.setModel({ path: 'Apple Intelligence' });

  // Create chat session (pass instructions when provided — the native plugin
  // feeds them to LanguageModelSession where they receive higher priority)
  const { id: chatId } = await LLM.createChat(
    instructions ? { instructions } : undefined,
  );

  // Track the response and listeners
  let latestSnapshot = '';
  let resolved = false;
  let textListener: any;
  let finishedListener: any;

  const cleanup = async () => {
    try {
      await textListener?.remove();
      await finishedListener?.remove();
      await LLM.deleteChat({ chatId });
    } catch (e) {
      logger?.error('Error cleaning up listeners/chat: ' + e);
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
  textListener = await LLM.addListener('textFromAi', (event: any) => {
    if (event.text) {
      latestSnapshot = event.text;
    }
  });

  finishedListener = await LLM.addListener('aiFinished', () => {
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
  void LLM.sendMessage({
    chatId,
    message: prompt,
  });

  return responsePromise;
}
