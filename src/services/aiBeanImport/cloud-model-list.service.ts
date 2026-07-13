import { AI_PROVIDER_ENUM } from '../../enums/settings/aiProvider';

export interface CloudModel {
  id: string;
  name: string;
  contextLength?: number;
}

const TIMEOUT_MS = 15000;

const OPENAI_EXCLUDED_PREFIXES = [
  'text-embedding',
  'whisper',
  'dall-e',
  'tts',
  'davinci',
  'babbage',
];

// ── Raw API response types ────────────────────────────────────────────

interface RawOpenAIModel {
  id: string;
}

interface RawAnthropicModel {
  id: string;
  display_name?: string;
}

interface RawGeminiModel {
  name?: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

interface RawMistralModel {
  id: string;
}

interface RawOpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
}

interface RawCustomModel {
  id: string;
}

// ── Config-driven model fetching ──────────────────────────────────────

interface ProviderModelConfig {
  url: string;
  headers: Record<string, string>;
  responseKey: string;
  filter?: (raw: unknown) => boolean;
  mapModel: (raw: unknown) => CloudModel;
}

function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeout),
  );
}

async function fetchModels(config: ProviderModelConfig): Promise<CloudModel[]> {
  const response = await fetchWithTimeout(config.url, {
    headers: config.headers,
  });
  const body = await response.json();
  const rawModels: unknown[] = body[config.responseKey] ?? [];
  const models = config.filter
    ? rawModels.filter(config.filter).map(config.mapModel)
    : rawModels.map(config.mapModel);
  return models.sort((a, b) => a.name.localeCompare(b.name));
}

function buildProviderConfig(
  provider: AI_PROVIDER_ENUM,
  apiKey: string,
  baseUrl?: string,
): ProviderModelConfig | null {
  switch (provider) {
    case AI_PROVIDER_ENUM.OPENAI:
      return {
        url: 'https://api.openai.com/v1/models',
        headers: { Authorization: `Bearer ${apiKey}` },
        responseKey: 'data',
        filter: (raw: unknown) => {
          const m = raw as RawOpenAIModel;
          return !OPENAI_EXCLUDED_PREFIXES.some((prefix) =>
            m.id.startsWith(prefix),
          );
        },
        mapModel: (raw: unknown) => {
          const m = raw as RawOpenAIModel;
          return { id: m.id, name: m.id };
        },
      };

    case AI_PROVIDER_ENUM.ANTHROPIC:
      return {
        url: 'https://api.anthropic.com/v1/models',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        responseKey: 'data',
        mapModel: (raw: unknown) => {
          const m = raw as RawAnthropicModel;
          return {
            id: m.id,
            name: m.display_name ?? m.id,
          };
        },
      };

    case AI_PROVIDER_ENUM.GOOGLE:
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        headers: {},
        responseKey: 'models',
        filter: (raw: unknown) => {
          const m = raw as RawGeminiModel;
          return Boolean(
            m.supportedGenerationMethods?.includes('generateContent'),
          );
        },
        mapModel: (raw: unknown) => {
          const m = raw as RawGeminiModel;
          return {
            id: (m.name ?? '').replace(/^models\//, ''),
            name: m.displayName ?? m.name ?? '',
          };
        },
      };

    case AI_PROVIDER_ENUM.MISTRAL:
      return {
        url: 'https://api.mistral.ai/v1/models',
        headers: { Authorization: `Bearer ${apiKey}` },
        responseKey: 'data',
        filter: (raw: unknown) => {
          const m = raw as RawMistralModel;
          return !m.id.startsWith('mistral-embed');
        },
        mapModel: (raw: unknown) => {
          const m = raw as RawMistralModel;
          return { id: m.id, name: m.id };
        },
      };

    case AI_PROVIDER_ENUM.OPENROUTER:
      return {
        url: 'https://openrouter.ai/api/v1/models',
        headers: {},
        responseKey: 'data',
        mapModel: (raw: unknown) => {
          const m = raw as RawOpenRouterModel;
          return {
            id: m.id,
            name: m.name ?? m.id,
            contextLength: m.context_length,
          };
        },
      };

    case AI_PROVIDER_ENUM.CUSTOM: {
      const cleanUrl = (baseUrl ?? '').replace(/\/+$/, '');
      return {
        url: `${cleanUrl}/models`,
        headers: { Authorization: `Bearer ${apiKey}` },
        responseKey: 'data',
        mapModel: (raw: unknown) => {
          const m = raw as RawCustomModel;
          return { id: m.id, name: m.id };
        },
      };
    }

    default:
      return null;
  }
}

export async function fetchAvailableModels(
  provider: AI_PROVIDER_ENUM,
  apiKey: string,
  baseUrl?: string,
): Promise<CloudModel[]> {
  try {
    const config = buildProviderConfig(provider, apiKey, baseUrl);
    if (!config) {
      return [];
    }
    return await fetchModels(config);
  } catch {
    return [];
  }
}
