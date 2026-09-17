import { AI_PROVIDER_ENUM } from '../../enums/settings/aiProvider';

const DEFAULT_TEMPERATURE = 0.1;
const TEMPERATURE_REJECTION_PATTERNS: readonly RegExp[] = [
  /["'`]?\btemperature\b["'`]?(?:\s+(?:parameter|setting|value))?\s+(?:is\s+)?(?:unsupported|not supported|deprecated)\b/i,
  /\b(?:unsupported|not supported|deprecated)\b(?:\s+(?:parameter|setting|value))?[\s:'"`-]*\btemperature\b["'`]?/i,
  /\btemperature\b[\s\S]{0,160}\bonly\s+(?:the\s+)?default\b/i,
  /\bonly\s+(?:the\s+)?default\b[\s\S]{0,160}\btemperature\b/i,
];
const temperatureRejectingIdentities = new Set<string>();

interface BuildOptions {
  readonly includeTemperature: boolean;
}

export interface CloudLLMConfig {
  provider: AI_PROVIDER_ENUM;
  apiKey: string;
  model: string;
  baseUrl?: string; // for CUSTOM provider
}

export interface CloudLLMMessage {
  role: 'system' | 'user';
  content: string;
}

export type CloudLLMDiagnosticEvent =
  | {
      readonly type: 'request_started';
      readonly provider: AI_PROVIDER_ENUM;
      readonly model: string;
    }
  | {
      readonly type: 'temperature_fallback_started';
      readonly provider: AI_PROVIDER_ENUM;
      readonly model: string;
    };

export type CloudLLMDiagnosticHandler = (
  event: CloudLLMDiagnosticEvent,
) => void;

export interface CloudLLMResponse {
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

class CloudLLMHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Cloud LLM API error (${status}): ${body}`);
  }
}

// ── Provider protocol config ─────────────────────────────────────────
//
// Each provider config defines URL, headers, request body shape, and
// response parsing. Transport and fallback policies stay separate below.

/** Protocol-level config that describes how to talk to a specific LLM API. */
interface ProviderProtocol {
  readonly url: string;
  readonly headers: Record<string, string>;
  buildRequestBody(
    model: string,
    messages: CloudLLMMessage[],
    options: BuildOptions,
  ): object;
  parseResponse(body: unknown): CloudLLMResponse;
}

/** Read a nested property from an unknown value, returning undefined on miss. */
function dig(obj: unknown, ...keys: (string | number)[]): unknown {
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string | number, unknown>)[k];
  }
  return cur;
}

// ── OpenAI-compatible protocol ───────────────────────────────────────
//
// Used by OpenAI, Google (Gemini), Mistral, OpenRouter, and Custom.
// All share the same body format, endpoint, and response shape.
// Differences are limited to base URL and optional extra headers.

class OpenAICompatibleProtocol implements ProviderProtocol {
  readonly url: string;
  readonly headers: Record<string, string>;

  constructor(
    baseUrl: string,
    apiKey: string,
    extraHeaders?: Record<string, string>,
  ) {
    this.url = `${baseUrl}/chat/completions`;
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
  }

  buildRequestBody(
    model: string,
    messages: CloudLLMMessage[],
    options: BuildOptions,
  ): object {
    return {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      ...(options.includeTemperature
        ? { temperature: DEFAULT_TEMPERATURE }
        : {}),
    };
  }

  // API response shape is not validated — access defensively.
  parseResponse(body: unknown): CloudLLMResponse {
    const usage = dig(body, 'usage') as
      | { prompt_tokens: number; completion_tokens: number }
      | undefined;
    return {
      content: String(dig(body, 'choices', 0, 'message', 'content') ?? ''),
      model: String(dig(body, 'model') ?? ''),
      usage,
    };
  }
}

// ── Anthropic protocol ───────────────────────────────────────────────
//
// Different auth header, API version header, body format (system message
// extracted, max_tokens required), endpoint (/messages), and response
// shape (content[].text instead of choices[].message.content).

class AnthropicProtocol implements ProviderProtocol {
  readonly url: string;
  readonly headers: Record<string, string>;

  constructor(apiKey: string) {
    this.url = 'https://api.anthropic.com/v1/messages';
    this.headers = {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    };
  }

  buildRequestBody(
    model: string,
    messages: CloudLLMMessage[],
    options: BuildOptions,
  ): object {
    const systemMsg = messages.find((m) => m.role === 'system');
    const userMsgs = messages.filter((m) => m.role !== 'system');
    return {
      model,
      max_tokens: 4096,
      ...(options.includeTemperature
        ? { temperature: DEFAULT_TEMPERATURE }
        : {}),
      system: systemMsg?.content ?? '',
      messages: userMsgs.map((m) => ({ role: m.role, content: m.content })),
    };
  }

  // API response shape is not validated — access defensively.
  parseResponse(body: unknown): CloudLLMResponse {
    const usage = dig(body, 'usage') as Record<string, unknown> | undefined;
    return {
      content: String(dig(body, 'content', 0, 'text') ?? ''),
      model: String(dig(body, 'model') ?? ''),
      usage: usage
        ? {
            prompt_tokens: Number(usage.input_tokens ?? 0),
            completion_tokens: Number(usage.output_tokens ?? 0),
          }
        : undefined,
    };
  }
}

// ── Factory ──────────────────────────────────────────────────────────

function createProtocol(config: CloudLLMConfig): ProviderProtocol {
  switch (config.provider) {
    case AI_PROVIDER_ENUM.ANTHROPIC:
      return new AnthropicProtocol(config.apiKey);

    case AI_PROVIDER_ENUM.OPENROUTER:
      return new OpenAICompatibleProtocol(
        'https://openrouter.ai/api/v1',
        config.apiKey,
        {
          'HTTP-Referer': 'https://beanconqueror.com',
          'X-OpenRouter-Title': 'Beanconqueror',
        },
      );

    case AI_PROVIDER_ENUM.CUSTOM:
      return new OpenAICompatibleProtocol(
        (config.baseUrl ?? '').replace(/\/+$/, ''),
        config.apiKey,
      );

    case AI_PROVIDER_ENUM.GOOGLE:
      return new OpenAICompatibleProtocol(
        'https://generativelanguage.googleapis.com/v1beta/openai',
        config.apiKey,
      );

    case AI_PROVIDER_ENUM.MISTRAL:
      return new OpenAICompatibleProtocol(
        'https://api.mistral.ai/v1',
        config.apiKey,
      );

    case AI_PROVIDER_ENUM.OPENAI:
    default:
      return new OpenAICompatibleProtocol(
        'https://api.openai.com/v1',
        config.apiKey,
      );
  }
}

// ── Transport and retry policy ──────────────────────────────────────

function hasStructuredTemperatureParameter(body: string): boolean {
  try {
    const parsedBody: unknown = JSON.parse(body);
    return dig(parsedBody, 'error', 'param') === 'temperature';
  } catch {
    return false;
  }
}

function extractErrorMessage(body: string): string {
  try {
    const parsedBody: unknown = JSON.parse(body);
    if (typeof parsedBody === 'string') {
      return parsedBody;
    }

    const nestedMessage = dig(parsedBody, 'error', 'message');
    if (typeof nestedMessage === 'string') {
      return nestedMessage;
    }

    const topLevelMessage = dig(parsedBody, 'message');
    return typeof topLevelMessage === 'string' ? topLevelMessage : '';
  } catch {
    return body;
  }
}

function providerEndpointModelIdentity(
  provider: AI_PROVIDER_ENUM,
  endpoint: string,
  model: string,
): string {
  return JSON.stringify([provider, endpoint, model]);
}

function isTemperatureRejection(error: unknown): boolean {
  if (!(error instanceof CloudLLMHttpError) || error.status !== 400) {
    return false;
  }

  if (hasStructuredTemperatureParameter(error.body)) {
    return true;
  }

  const errorMessage = extractErrorMessage(error.body);
  return TEMPERATURE_REJECTION_PATTERNS.some((pattern) =>
    pattern.test(errorMessage),
  );
}

async function sendOnce(
  protocol: ProviderProtocol,
  model: string,
  messages: CloudLLMMessage[],
  options: BuildOptions,
): Promise<CloudLLMResponse> {
  const requestBody = protocol.buildRequestBody(model, messages, options);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(protocol.url, {
      method: 'POST',
      headers: protocol.headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new CloudLLMHttpError(response.status, errorBody);
    }

    const body: unknown = await response.json();
    return protocol.parseResponse(body);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Cloud LLM request timed out after 30 seconds');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Public API ───────────────────────────────────────────────────────

export function resetTemperatureRejectionCache(): void {
  temperatureRejectingIdentities.clear();
}

/**
 * Send a prompt to a cloud LLM provider and return the response.
 *
 * Protocol details (URL, headers, body format, response parsing) are
 * handled by provider-specific config classes. This function coordinates
 * session learning and the optional parameter fallback.
 */
export async function sendCloudLLMPrompt(
  config: CloudLLMConfig,
  messages: CloudLLMMessage[],
  onDiagnosticEvent?: CloudLLMDiagnosticHandler,
): Promise<CloudLLMResponse> {
  const protocol = createProtocol(config);
  const identity = providerEndpointModelIdentity(
    config.provider,
    protocol.url,
    config.model,
  );
  const includeTemperature = !temperatureRejectingIdentities.has(identity);

  onDiagnosticEvent?.({
    type: 'request_started',
    provider: config.provider,
    model: config.model,
  });

  try {
    return await sendOnce(protocol, config.model, messages, {
      includeTemperature,
    });
  } catch (error: unknown) {
    if (!includeTemperature || !isTemperatureRejection(error)) {
      throw error;
    }

    temperatureRejectingIdentities.add(identity);
    onDiagnosticEvent?.({
      type: 'temperature_fallback_started',
      provider: config.provider,
      model: config.model,
    });
    return sendOnce(protocol, config.model, messages, {
      includeTemperature: false,
    });
  }
}
