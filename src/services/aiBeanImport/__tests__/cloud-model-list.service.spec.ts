import { AI_PROVIDER_ENUM } from '../../../enums/settings/aiProvider';
import { fetchAvailableModels } from '../cloud-model-list.service';

describe('cloud-model-list.service', () => {
  let fetchSpy: jasmine.Spy;

  function mockFetchResponse(body: object, status = 200): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    } as unknown as Response;
  }

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, 'fetch');
  });

  // ── Shared behaviors (parametrized) ────────────────────────────────

  describe('shared behaviors', () => {
    interface ProviderCase {
      label: string;
      provider: AI_PROVIDER_ENUM;
      apiKey: string;
      baseUrl?: string;
      emptyResponse: object;
      sortResponse: object;
      expectedSortOrder: string[];
      expectedUrl: string;
      expectedHeaders: Record<string, string>;
    }

    const providerCases: ProviderCase[] = [
      {
        label: 'OpenAI',
        provider: AI_PROVIDER_ENUM.OPENAI,
        apiKey: 'test-key',
        emptyResponse: { data: [] },
        sortResponse: {
          data: [
            { id: 'gpt-4o-mini' },
            { id: 'gpt-3.5-turbo' },
            { id: 'gpt-4o' },
          ],
        },
        expectedSortOrder: ['gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
        expectedUrl: 'https://api.openai.com/v1/models',
        expectedHeaders: { Authorization: 'Bearer test-key' },
      },
      {
        label: 'Anthropic',
        provider: AI_PROVIDER_ENUM.ANTHROPIC,
        apiKey: 'test-key',
        emptyResponse: { data: [] },
        sortResponse: {
          data: [
            { id: 'c', display_name: 'Zebra' },
            { id: 'a', display_name: 'Alpha' },
            { id: 'b', display_name: 'Middle' },
          ],
        },
        expectedSortOrder: ['Alpha', 'Middle', 'Zebra'],
        expectedUrl: 'https://api.anthropic.com/v1/models',
        expectedHeaders: {
          'x-api-key': 'test-key',
          'anthropic-version': '2023-06-01',
        },
      },
      {
        label: 'Google Gemini',
        provider: AI_PROVIDER_ENUM.GOOGLE,
        apiKey: 'test-key',
        emptyResponse: { models: [] },
        sortResponse: {
          models: [
            {
              name: 'models/z',
              displayName: 'Zebra',
              supportedGenerationMethods: ['generateContent'],
            },
            {
              name: 'models/a',
              displayName: 'Alpha',
              supportedGenerationMethods: ['generateContent'],
            },
            {
              name: 'models/m',
              displayName: 'Middle',
              supportedGenerationMethods: ['generateContent'],
            },
          ],
        },
        expectedSortOrder: ['Alpha', 'Middle', 'Zebra'],
        expectedUrl:
          'https://generativelanguage.googleapis.com/v1beta/models?key=test-key',
        expectedHeaders: {},
      },
      {
        label: 'Mistral',
        provider: AI_PROVIDER_ENUM.MISTRAL,
        apiKey: 'test-key',
        emptyResponse: { data: [] },
        sortResponse: {
          data: [{ id: 'mistral-z' }, { id: 'mistral-a' }, { id: 'mistral-m' }],
        },
        expectedSortOrder: ['mistral-a', 'mistral-m', 'mistral-z'],
        expectedUrl: 'https://api.mistral.ai/v1/models',
        expectedHeaders: { Authorization: 'Bearer test-key' },
      },
      {
        label: 'OpenRouter',
        provider: AI_PROVIDER_ENUM.OPENROUTER,
        apiKey: '',
        emptyResponse: { data: [] },
        sortResponse: {
          data: [
            { id: 'z', name: 'Zebra' },
            { id: 'a', name: 'Alpha' },
            { id: 'm', name: 'Middle' },
          ],
        },
        expectedSortOrder: ['Alpha', 'Middle', 'Zebra'],
        expectedUrl: 'https://openrouter.ai/api/v1/models',
        expectedHeaders: {},
      },
      {
        label: 'Custom',
        provider: AI_PROVIDER_ENUM.CUSTOM,
        apiKey: 'test-key',
        baseUrl: 'https://custom.example.com/v1',
        emptyResponse: { data: [] },
        sortResponse: {
          data: [{ id: 'z-model' }, { id: 'a-model' }, { id: 'm-model' }],
        },
        expectedSortOrder: ['a-model', 'm-model', 'z-model'],
        expectedUrl: 'https://custom.example.com/v1/models',
        expectedHeaders: { Authorization: 'Bearer test-key' },
      },
    ];

    describe('error handling', () => {
      it('should return empty array on network error', async () => {
        fetchSpy.and.returnValue(
          Promise.reject(new TypeError('Failed to fetch')),
        );
        const models = await fetchAvailableModels(
          AI_PROVIDER_ENUM.OPENAI,
          'test-key',
        );
        expect(models).toEqual([]);
      });

      it('should return empty array for unknown provider', async () => {
        const models = await fetchAvailableModels(
          'UNKNOWN' as AI_PROVIDER_ENUM,
          'key',
        );
        expect(models).toEqual([]);
      });
    });

    describe('sorting by name', () => {
      providerCases.forEach(
        ({
          label,
          provider,
          apiKey,
          baseUrl,
          sortResponse,
          expectedSortOrder,
        }) => {
          it(`should sort ${label} models by name`, async () => {
            fetchSpy.and.returnValue(
              Promise.resolve(mockFetchResponse(sortResponse)),
            );
            const models = await fetchAvailableModels(
              provider,
              apiKey,
              baseUrl,
            );
            expect(models.map((m) => m.name)).toEqual(expectedSortOrder);
          });
        },
      );
    });

    describe('auth and URL', () => {
      providerCases.forEach(
        ({
          label,
          provider,
          apiKey,
          baseUrl,
          emptyResponse,
          expectedUrl,
          expectedHeaders,
        }) => {
          it(`should send correct request for ${label}`, async () => {
            fetchSpy.and.returnValue(
              Promise.resolve(mockFetchResponse(emptyResponse)),
            );
            await fetchAvailableModels(provider, apiKey, baseUrl);
            const [url, options] = fetchSpy.calls.mostRecent().args;
            expect(url).toBe(expectedUrl);
            for (const [key, value] of Object.entries(expectedHeaders)) {
              expect(options.headers[key]).toBe(value);
            }
          });
        },
      );
    });
  });

  // ── Provider-specific mapping & filtering ──────────────────────────

  describe('OpenRouter', () => {
    it('should map context_length from API response', async () => {
      // Arrange
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            data: [
              {
                id: 'openai/gpt-4o',
                name: 'GPT-4o',
                context_length: 128000,
              },
              {
                id: 'anthropic/claude-sonnet-4-20250514',
                name: 'Claude Sonnet',
                context_length: 200000,
              },
            ],
          }),
        ),
      );

      // Act
      const models = await fetchAvailableModels(
        AI_PROVIDER_ENUM.OPENROUTER,
        '',
      );

      // Assert
      expect(models.length).toBe(2);
      const gpt4o = models.find((m) => m.id === 'openai/gpt-4o');
      const claude = models.find(
        (m) => m.id === 'anthropic/claude-sonnet-4-20250514',
      );
      expect(gpt4o.contextLength).toBe(128000);
      expect(claude.contextLength).toBe(200000);
    });
  });

  describe('OpenAI', () => {
    it('should filter out non-chat models', async () => {
      // Arrange
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            data: [
              { id: 'gpt-4o' },
              { id: 'gpt-4o-mini' },
              { id: 'text-embedding-3-large' },
              { id: 'text-embedding-ada-002' },
              { id: 'whisper-1' },
              { id: 'dall-e-3' },
              { id: 'tts-1' },
              { id: 'tts-1-hd' },
              { id: 'davinci-002' },
              { id: 'babbage-002' },
            ],
          }),
        ),
      );

      // Act
      const models = await fetchAvailableModels(
        AI_PROVIDER_ENUM.OPENAI,
        'test-key',
      );

      // Assert
      const ids = models.map((m) => m.id);
      expect(ids).toContain('gpt-4o');
      expect(ids).toContain('gpt-4o-mini');
      expect(ids).not.toContain('text-embedding-3-large');
      expect(ids).not.toContain('text-embedding-ada-002');
      expect(ids).not.toContain('whisper-1');
      expect(ids).not.toContain('dall-e-3');
      expect(ids).not.toContain('tts-1');
      expect(ids).not.toContain('tts-1-hd');
      expect(ids).not.toContain('davinci-002');
      expect(ids).not.toContain('babbage-002');
    });

    it('should use id as both id and name', async () => {
      // Arrange
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            data: [{ id: 'gpt-4o' }],
          }),
        ),
      );

      // Act
      const models = await fetchAvailableModels(
        AI_PROVIDER_ENUM.OPENAI,
        'test-key',
      );

      // Assert
      expect(models[0].id).toBe('gpt-4o');
      expect(models[0].name).toBe('gpt-4o');
    });
  });

  describe('Anthropic', () => {
    it('should parse display_name and id', async () => {
      // Arrange
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            data: [
              {
                id: 'claude-sonnet-4-20250514',
                display_name: 'Claude Sonnet 4',
              },
              { id: 'claude-haiku-3-20240307', display_name: 'Claude 3 Haiku' },
            ],
          }),
        ),
      );

      // Act
      const models = await fetchAvailableModels(
        AI_PROVIDER_ENUM.ANTHROPIC,
        'test-key',
      );

      // Assert
      expect(models.length).toBe(2);
      const sonnet = models.find((m) => m.id === 'claude-sonnet-4-20250514');
      expect(sonnet.name).toBe('Claude Sonnet 4');
    });

    it('should fall back to id when display_name is missing', async () => {
      // Arrange
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            data: [{ id: 'claude-unknown' }],
          }),
        ),
      );

      // Act
      const models = await fetchAvailableModels(
        AI_PROVIDER_ENUM.ANTHROPIC,
        'test-key',
      );

      // Assert
      expect(models[0].name).toBe('claude-unknown');
    });
  });

  describe('Google Gemini', () => {
    it('should strip models/ prefix and filter by generateContent', async () => {
      // Arrange
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            models: [
              {
                name: 'models/gemini-2.0-flash',
                displayName: 'Gemini 2.0 Flash',
                supportedGenerationMethods: ['generateContent', 'countTokens'],
              },
              {
                name: 'models/embedding-001',
                displayName: 'Embedding 001',
                supportedGenerationMethods: ['embedContent'],
              },
              {
                name: 'models/gemini-1.5-pro',
                displayName: 'Gemini 1.5 Pro',
                supportedGenerationMethods: ['generateContent', 'countTokens'],
              },
            ],
          }),
        ),
      );

      // Act
      const models = await fetchAvailableModels(
        AI_PROVIDER_ENUM.GOOGLE,
        'test-key',
      );

      // Assert
      expect(models.length).toBe(2);
      const ids = models.map((m) => m.id);
      expect(ids).toContain('gemini-2.0-flash');
      expect(ids).toContain('gemini-1.5-pro');
      expect(ids).not.toContain('embedding-001');
      expect(ids).not.toContain('models/gemini-2.0-flash');
    });
  });

  describe('Mistral', () => {
    it('should filter out mistral-embed models', async () => {
      // Arrange
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            data: [
              { id: 'mistral-large-latest' },
              { id: 'mistral-embed' },
              { id: 'mistral-small-latest' },
              { id: 'mistral-embed-2' },
            ],
          }),
        ),
      );

      // Act
      const models = await fetchAvailableModels(
        AI_PROVIDER_ENUM.MISTRAL,
        'test-key',
      );

      // Assert
      const ids = models.map((m) => m.id);
      expect(ids).toContain('mistral-large-latest');
      expect(ids).toContain('mistral-small-latest');
      expect(ids).not.toContain('mistral-embed');
      expect(ids).not.toContain('mistral-embed-2');
    });

    it('should use id as both id and name', async () => {
      // Arrange
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            data: [{ id: 'mistral-large-latest' }],
          }),
        ),
      );

      // Act
      const models = await fetchAvailableModels(
        AI_PROVIDER_ENUM.MISTRAL,
        'test-key',
      );

      // Assert
      expect(models[0].id).toBe('mistral-large-latest');
      expect(models[0].name).toBe('mistral-large-latest');
    });
  });

  describe('Custom', () => {
    it('should use baseUrl to fetch models', async () => {
      // Arrange
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            data: [{ id: 'local-model' }],
          }),
        ),
      );

      // Act
      const models = await fetchAvailableModels(
        AI_PROVIDER_ENUM.CUSTOM,
        'key',
        'https://my-server.example.com/v1',
      );

      // Assert
      const [url] = fetchSpy.calls.mostRecent().args;
      expect(url).toBe('https://my-server.example.com/v1/models');
      expect(models.length).toBe(1);
      expect(models[0].id).toBe('local-model');
    });
  });
});
