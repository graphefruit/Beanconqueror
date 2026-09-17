import { AI_PROVIDER_ENUM } from '../../../enums/settings/aiProvider';
import {
  CloudLLMConfig,
  CloudLLMDiagnosticEvent,
  CloudLLMDiagnosticHandler,
  CloudLLMMessage,
  resetTemperatureRejectionCache,
  sendCloudLLMPrompt,
} from '../cloud-llm-communication.service';

describe('cloud-llm-communication.service', () => {
  let fetchSpy: jasmine.Spy;

  const systemMessage: CloudLLMMessage = {
    role: 'system',
    content: 'You are a helpful assistant.',
  };
  const userMessage: CloudLLMMessage = {
    role: 'user',
    content: 'Extract bean info from this label.',
  };
  const messages: CloudLLMMessage[] = [systemMessage, userMessage];

  function createConfig(
    overrides: Partial<CloudLLMConfig> = {},
  ): CloudLLMConfig {
    return {
      provider: AI_PROVIDER_ENUM.OPENAI,
      apiKey: 'test-api-key',
      model: 'gpt-4o',
      ...overrides,
    };
  }

  function createDiagnosticRecorder(): {
    readonly events: readonly CloudLLMDiagnosticEvent[];
    readonly handler: CloudLLMDiagnosticHandler;
  } {
    const events: CloudLLMDiagnosticEvent[] = [];

    return {
      events,
      handler: (event) => events.push(event),
    };
  }

  function mockFetchResponse(
    body: object,
    status = 200,
    responseText = JSON.stringify(body),
  ): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(responseText),
    } as unknown as Response;
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  function requestBodyForCall(callIndex: number): Record<string, unknown> {
    const serializedBody: unknown = fetchSpy.calls.argsFor(callIndex)[1].body;
    if (typeof serializedBody !== 'string') {
      throw new Error(`Fetch call ${callIndex} has no serialized body`);
    }

    const body: unknown = JSON.parse(serializedBody);
    if (!isRecord(body)) {
      throw new Error(`Fetch call ${callIndex} body is not an object`);
    }

    return body;
  }

  beforeEach(() => {
    resetTemperatureRejectionCache();
    fetchSpy = spyOn(globalThis, 'fetch');
  });

  // ── Request building per provider ──────────────────────────────────

  describe('request building', () => {
    // WHY: Each provider has a different base URL, header format, and body shape.
    // These tests verify the correct request is sent for each provider.

    it('should build correct request for OpenAI', async () => {
      // Arrange
      const config = createConfig({
        provider: AI_PROVIDER_ENUM.OPENAI,
      });
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'response' } }],
            model: 'gpt-4o',
          }),
        ),
      );

      // Act
      await sendCloudLLMPrompt(config, messages);

      // Assert
      const [url, options] = fetchSpy.calls.mostRecent().args;
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      expect(options.headers.Authorization).toBe('Bearer test-api-key');
      expect(options.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(options.body);
      expect(body.model).toBe('gpt-4o');
      expect(body.temperature).toBe(0.1);
      expect(body.messages.length).toBe(2);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[1].role).toBe('user');
    });

    it('should build correct request for Google (Gemini via OpenAI-compatible endpoint)', async () => {
      // Arrange
      const config = createConfig({
        provider: AI_PROVIDER_ENUM.GOOGLE,
        model: 'gemini-2.0-flash',
      });
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'response' } }],
            model: 'gemini-2.0-flash',
          }),
        ),
      );

      // Act
      await sendCloudLLMPrompt(config, messages);

      // Assert
      const [url, options] = fetchSpy.calls.mostRecent().args;
      expect(url).toBe(
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      );
      expect(options.headers.Authorization).toBe('Bearer test-api-key');

      const body = JSON.parse(options.body);
      expect(body.model).toBe('gemini-2.0-flash');
    });

    it('should build correct request for Anthropic', async () => {
      // WHY: Anthropic uses a different auth header, API version header,
      // separate system param, and /messages endpoint.

      // Arrange
      const config = createConfig({
        provider: AI_PROVIDER_ENUM.ANTHROPIC,
        model: 'claude-sonnet-4-20250514',
      });
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            content: [{ text: 'response' }],
            model: 'claude-sonnet-4-20250514',
          }),
        ),
      );

      // Act
      await sendCloudLLMPrompt(config, messages);

      // Assert
      const [url, options] = fetchSpy.calls.mostRecent().args;
      expect(url).toBe('https://api.anthropic.com/v1/messages');
      expect(options.headers['x-api-key']).toBe('test-api-key');
      expect(options.headers['anthropic-version']).toBe('2023-06-01');
      expect(options.headers.Authorization).toBeUndefined();

      const body = JSON.parse(options.body);
      expect(body.model).toBe('claude-sonnet-4-20250514');
      expect(body.max_tokens).toBe(4096);
      expect(body.temperature).toBe(0.1);
      expect(body.system).toBe('You are a helpful assistant.');
      expect(body.messages.length).toBe(1);
      expect(body.messages[0].role).toBe('user');
    });

    it('should build correct request for OpenRouter', async () => {
      // Arrange
      const config = createConfig({
        provider: AI_PROVIDER_ENUM.OPENROUTER,
        model: 'anthropic/claude-sonnet-4-20250514',
      });
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'response' } }],
            model: 'anthropic/claude-sonnet-4-20250514',
          }),
        ),
      );

      // Act
      await sendCloudLLMPrompt(config, messages);

      // Assert
      const [url, options] = fetchSpy.calls.mostRecent().args;
      expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
      expect(options.headers.Authorization).toBe('Bearer test-api-key');
      expect(options.headers['HTTP-Referer']).toBe('https://beanconqueror.com');
      expect(options.headers['X-OpenRouter-Title']).toBe('Beanconqueror');

      const body = JSON.parse(options.body);
      expect(body.model).toBe('anthropic/claude-sonnet-4-20250514');
    });

    it('should strip trailing slash from custom base URL', async () => {
      // Arrange
      const config = createConfig({
        provider: AI_PROVIDER_ENUM.CUSTOM,
        model: 'my-model',
        baseUrl: 'https://my-llm.example.com/api/',
      });
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'response' } }],
            model: 'my-model',
          }),
        ),
      );

      // Act
      await sendCloudLLMPrompt(config, messages);

      // Assert
      const [url] = fetchSpy.calls.mostRecent().args;
      expect(url).toBe('https://my-llm.example.com/api/chat/completions');
    });

    it('should send Anthropic body without system message when none provided', async () => {
      // Arrange
      const config = createConfig({
        provider: AI_PROVIDER_ENUM.ANTHROPIC,
        model: 'claude-sonnet-4-20250514',
      });
      const userOnly: CloudLLMMessage[] = [userMessage];
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            content: [{ text: 'response' }],
            model: 'claude-sonnet-4-20250514',
          }),
        ),
      );

      // Act
      await sendCloudLLMPrompt(config, userOnly);

      // Assert
      const body = JSON.parse(fetchSpy.calls.mostRecent().args[1].body);
      expect(body.system).toBe('');
      expect(body.messages.length).toBe(1);
    });
  });

  // ── Response parsing ───────────────────────────────────────────────

  describe('response parsing', () => {
    it('should parse OpenAI-compatible response with usage', async () => {
      // Arrange
      const config = createConfig();
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'Parsed bean info' } }],
            model: 'gpt-4o',
            usage: { prompt_tokens: 100, completion_tokens: 50 },
          }),
        ),
      );

      // Act
      const result = await sendCloudLLMPrompt(config, messages);

      // Assert
      expect(result.content).toBe('Parsed bean info');
      expect(result.model).toBe('gpt-4o');
      expect(result.usage).toEqual({
        prompt_tokens: 100,
        completion_tokens: 50,
      });
    });

    it('should parse OpenAI-compatible response without usage', async () => {
      // Arrange
      const config = createConfig();
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'response' } }],
            model: 'gpt-4o',
          }),
        ),
      );

      // Act
      const result = await sendCloudLLMPrompt(config, messages);

      // Assert
      expect(result.content).toBe('response');
      expect(result.usage).toBeUndefined();
    });

    it('should parse Anthropic response format', async () => {
      // WHY: Anthropic uses content[].text instead of choices[].message.content,
      // and input_tokens/output_tokens instead of prompt_tokens/completion_tokens.

      // Arrange
      const config = createConfig({
        provider: AI_PROVIDER_ENUM.ANTHROPIC,
        model: 'claude-sonnet-4-20250514',
      });
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            content: [{ text: 'Anthropic response' }],
            model: 'claude-sonnet-4-20250514',
            usage: { input_tokens: 80, output_tokens: 40 },
          }),
        ),
      );

      // Act
      const result = await sendCloudLLMPrompt(config, messages);

      // Assert
      expect(result.content).toBe('Anthropic response');
      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.usage).toEqual({
        prompt_tokens: 80,
        completion_tokens: 40,
      });
    });

    it('should handle empty/missing content gracefully', async () => {
      // WHY: API may return empty choices array or missing fields

      // Arrange
      const config = createConfig();
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            choices: [],
            model: 'gpt-4o',
          }),
        ),
      );

      // Act
      const result = await sendCloudLLMPrompt(config, messages);

      // Assert
      expect(result.content).toBe('');
      expect(result.model).toBe('gpt-4o');
    });

    it('should handle empty Anthropic content array gracefully', async () => {
      // Arrange
      const config = createConfig({
        provider: AI_PROVIDER_ENUM.ANTHROPIC,
        model: 'claude-sonnet-4-20250514',
      });
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            content: [],
            model: 'claude-sonnet-4-20250514',
          }),
        ),
      );

      // Act
      const result = await sendCloudLLMPrompt(config, messages);

      // Assert
      expect(result.content).toBe('');
    });
  });

  // ── Diagnostics ───────────────────────────────────────────────────

  describe('diagnostics', () => {
    it('reports the configured provider and model when a logical request starts', async () => {
      // Arrange
      const config = createConfig({
        provider: AI_PROVIDER_ENUM.MISTRAL,
        model: 'mistral-large-2411',
      });
      const diagnostics = createDiagnosticRecorder();
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'response' } }],
            model: 'mistral-large-2411',
          }),
        ),
      );

      // Act
      await sendCloudLLMPrompt(config, messages, diagnostics.handler);

      // Assert
      expect(diagnostics.events).toEqual([
        {
          type: 'request_started',
          provider: AI_PROVIDER_ENUM.MISTRAL,
          model: 'mistral-large-2411',
        },
      ]);
    });

    it('preserves an unknown custom model identifier', async () => {
      // Arrange
      const model = 'organization/model.name:2026_08-03-rc1';
      const config = createConfig({
        provider: AI_PROVIDER_ENUM.CUSTOM,
        model,
        baseUrl: 'https://custom.example.com/v1',
      });
      const diagnostics = createDiagnosticRecorder();
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'response' } }],
            model,
          }),
        ),
      );

      // Act
      await sendCloudLLMPrompt(config, messages, diagnostics.handler);

      // Assert
      expect(diagnostics.events).toEqual([
        {
          type: 'request_started',
          provider: AI_PROVIDER_ENUM.CUSTOM,
          model,
        },
      ]);
    });

    it('reports a temperature fallback once before retrying', async () => {
      // Arrange
      const config = createConfig({ model: 'gpt-5' });
      const diagnostics = createDiagnosticRecorder();
      fetchSpy.and.returnValues(
        Promise.resolve(
          mockFetchResponse({ error: { param: 'temperature' } }, 400),
        ),
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'Retried response' } }],
            model: 'gpt-5',
          }),
        ),
      );

      // Act
      await sendCloudLLMPrompt(config, messages, diagnostics.handler);

      // Assert
      expect(diagnostics.events).toEqual([
        {
          type: 'request_started',
          provider: AI_PROVIDER_ENUM.OPENAI,
          model: 'gpt-5',
        },
        {
          type: 'temperature_fallback_started',
          provider: AI_PROVIDER_ENUM.OPENAI,
          model: 'gpt-5',
        },
      ]);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ── Temperature fallback ───────────────────────────────────────────

  describe('temperature fallback', () => {
    it('should retry without temperature after a structured parameter rejection', async () => {
      // Arrange
      const config = createConfig({ model: 'gpt-5' });
      fetchSpy.and.returnValues(
        Promise.resolve(
          mockFetchResponse(
            {
              error: {
                param: 'temperature',
                message: 'Unsupported parameter: temperature',
              },
            },
            400,
          ),
        ),
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'Retried response' } }],
            model: 'gpt-5',
          }),
        ),
      );

      // Act
      const result = await sendCloudLLMPrompt(config, messages);

      // Assert
      const firstBody = requestBodyForCall(0);
      const secondBody = requestBodyForCall(1);
      expect(result.content).toBe('Retried response');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(firstBody.temperature).toBe(0.1);
      expect(secondBody.temperature).toBeUndefined();
    });

    it('should retry without temperature after an Anthropic deprecation error', async () => {
      // Arrange
      const config = createConfig({
        provider: AI_PROVIDER_ENUM.ANTHROPIC,
        model: 'claude-opus-4-1',
      });
      fetchSpy.and.returnValues(
        Promise.resolve(
          mockFetchResponse(
            {
              error: {
                type: 'invalid_request_error',
                message: '`temperature` is deprecated for this model',
              },
            },
            400,
          ),
        ),
        Promise.resolve(
          mockFetchResponse({
            content: [{ text: 'Retried Anthropic response' }],
            model: 'claude-opus-4-1',
          }),
        ),
      );

      // Act
      const result = await sendCloudLLMPrompt(config, messages);

      // Assert
      const firstBody = requestBodyForCall(0);
      const secondBody = requestBodyForCall(1);
      expect(result.content).toBe('Retried Anthropic response');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(firstBody.temperature).toBe(0.1);
      expect(secondBody.temperature).toBeUndefined();
    });

    it('should not retry when a bad request only mentions temperature', async () => {
      // Arrange
      const config = createConfig({ model: 'gpt-5' });
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse(
            { error: { message: 'Temperature must be between 0 and 2' } },
            400,
          ),
        ),
      );

      // Act
      const request = sendCloudLLMPrompt(config, messages);

      // Assert
      await expectAsync(request).toBeRejectedWithError(
        'Cloud LLM API error (400): {"error":{"message":"Temperature must be between 0 and 2"}}',
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should not retry an unrelated bad request', async () => {
      // Arrange
      const config = createConfig({ model: 'gpt-5' });
      const diagnostics = createDiagnosticRecorder();
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse(
            { error: { param: 'messages', message: 'Messages are required' } },
            400,
          ),
        ),
      );

      // Act
      const request = sendCloudLLMPrompt(config, messages, diagnostics.handler);

      // Assert
      await expectAsync(request).toBeRejectedWithError(
        'Cloud LLM API error (400): {"error":{"param":"messages","message":"Messages are required"}}',
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(diagnostics.events).toEqual([
        {
          type: 'request_started',
          provider: AI_PROVIDER_ENUM.OPENAI,
          model: 'gpt-5',
        },
      ]);
    });

    it('should not combine unrelated terms from separate error fields', async () => {
      // Arrange
      const config = createConfig({ model: 'gpt-5' });
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse(
            {
              error: { message: 'The requested model is unsupported' },
              request: { temperature: 0.1 },
            },
            400,
          ),
        ),
      );

      // Act
      const request = sendCloudLLMPrompt(config, messages);

      // Assert
      await expectAsync(request).toBeRejectedWithError(
        'Cloud LLM API error (400): {"error":{"message":"The requested model is unsupported"},"request":{"temperature":0.1}}',
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should not retry a non-400 temperature rejection', async () => {
      // Arrange
      const config = createConfig({ model: 'gpt-5' });
      fetchSpy.and.returnValue(
        Promise.resolve(
          mockFetchResponse(
            { error: { message: 'Temperature is not supported' } },
            422,
          ),
        ),
      );

      // Act
      const request = sendCloudLLMPrompt(config, messages);

      // Assert
      await expectAsync(request).toBeRejectedWithError(
        'Cloud LLM API error (422): {"error":{"message":"Temperature is not supported"}}',
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should propagate a failed retry without making a third request', async () => {
      // Arrange
      const config = createConfig({ model: 'gpt-5' });
      const diagnostics = createDiagnosticRecorder();
      fetchSpy.and.returnValues(
        Promise.resolve(
          mockFetchResponse({ error: { param: 'temperature' } }, 400),
        ),
        Promise.resolve(mockFetchResponse({}, 503, 'Retry unavailable')),
      );

      // Act
      const request = sendCloudLLMPrompt(config, messages, diagnostics.handler);

      // Assert
      await expectAsync(request).toBeRejectedWithError(
        'Cloud LLM API error (503): Retry unavailable',
      );
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(diagnostics.events).toEqual([
        {
          type: 'request_started',
          provider: AI_PROVIDER_ENUM.OPENAI,
          model: 'gpt-5',
        },
        {
          type: 'temperature_fallback_started',
          provider: AI_PROVIDER_ENUM.OPENAI,
          model: 'gpt-5',
        },
      ]);
    });
  });

  // ── Session learning ───────────────────────────────────────────────

  describe('temperature rejection learning', () => {
    it('should omit temperature on a later call for the same identity', async () => {
      // Arrange
      const config = createConfig({ model: 'gpt-5-session-learning' });
      const diagnostics = createDiagnosticRecorder();
      fetchSpy.and.returnValues(
        Promise.resolve(
          mockFetchResponse({ error: { param: 'temperature' } }, 400),
        ),
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'Retry response' } }],
            model: 'gpt-5-session-learning',
          }),
        ),
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'Learned response' } }],
            model: 'gpt-5-session-learning',
          }),
        ),
      );

      // Act
      await sendCloudLLMPrompt(config, messages, diagnostics.handler);
      const result = await sendCloudLLMPrompt(
        config,
        messages,
        diagnostics.handler,
      );

      // Assert
      expect(result.content).toBe('Learned response');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(requestBodyForCall(0).temperature).toBe(0.1);
      expect(requestBodyForCall(1).temperature).toBeUndefined();
      expect(requestBodyForCall(2).temperature).toBeUndefined();
      expect(diagnostics.events).toEqual([
        {
          type: 'request_started',
          provider: AI_PROVIDER_ENUM.OPENAI,
          model: 'gpt-5-session-learning',
        },
        {
          type: 'temperature_fallback_started',
          provider: AI_PROVIDER_ENUM.OPENAI,
          model: 'gpt-5-session-learning',
        },
        {
          type: 'request_started',
          provider: AI_PROVIDER_ENUM.OPENAI,
          model: 'gpt-5-session-learning',
        },
      ]);
    });

    it('should share learned state across equivalent custom endpoint URLs', async () => {
      // Arrange
      const firstConfig = createConfig({
        provider: AI_PROVIDER_ENUM.CUSTOM,
        model: 'custom-session-model',
        baseUrl: 'https://custom.example.com/v1/',
      });
      const equivalentConfig = createConfig({
        provider: AI_PROVIDER_ENUM.CUSTOM,
        model: 'custom-session-model',
        baseUrl: 'https://custom.example.com/v1',
      });
      fetchSpy.and.returnValues(
        Promise.resolve(
          mockFetchResponse({ error: { param: 'temperature' } }, 400),
        ),
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'Retry response' } }],
            model: 'custom-session-model',
          }),
        ),
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'Equivalent response' } }],
            model: 'custom-session-model',
          }),
        ),
      );

      // Act
      await sendCloudLLMPrompt(firstConfig, messages);
      const result = await sendCloudLLMPrompt(equivalentConfig, messages);

      // Assert
      expect(result.content).toBe('Equivalent response');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(fetchSpy.calls.argsFor(0)[0]).toBe(
        'https://custom.example.com/v1/chat/completions',
      );
      expect(fetchSpy.calls.argsFor(2)[0]).toBe(
        'https://custom.example.com/v1/chat/completions',
      );
      expect(requestBodyForCall(2).temperature).toBeUndefined();
    });

    it('should isolate learned state between different custom endpoints', async () => {
      // Arrange
      const firstConfig = createConfig({
        provider: AI_PROVIDER_ENUM.CUSTOM,
        model: 'shared-model-name',
        baseUrl: 'https://first.example.com/v1',
      });
      const otherEndpointConfig = createConfig({
        provider: AI_PROVIDER_ENUM.CUSTOM,
        model: 'shared-model-name',
        baseUrl: 'https://second.example.com/v1',
      });
      fetchSpy.and.returnValues(
        Promise.resolve(
          mockFetchResponse({ error: { param: 'temperature' } }, 400),
        ),
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'Retry response' } }],
            model: 'shared-model-name',
          }),
        ),
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'Other endpoint response' } }],
            model: 'shared-model-name',
          }),
        ),
      );

      // Act
      await sendCloudLLMPrompt(firstConfig, messages);
      const result = await sendCloudLLMPrompt(otherEndpointConfig, messages);

      // Assert
      expect(result.content).toBe('Other endpoint response');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(fetchSpy.calls.argsFor(2)[0]).toBe(
        'https://second.example.com/v1/chat/completions',
      );
      expect(requestBodyForCall(2).temperature).toBe(0.1);
    });

    it('should isolate learned state between different providers', async () => {
      // Arrange
      const openAIConfig = createConfig({ model: 'shared-provider-model' });
      const customConfig = createConfig({
        provider: AI_PROVIDER_ENUM.CUSTOM,
        model: 'shared-provider-model',
        baseUrl: 'https://api.openai.com/v1',
      });
      fetchSpy.and.returnValues(
        Promise.resolve(
          mockFetchResponse({ error: { param: 'temperature' } }, 400),
        ),
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'Retry response' } }],
            model: 'shared-provider-model',
          }),
        ),
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'Other provider response' } }],
            model: 'shared-provider-model',
          }),
        ),
      );

      // Act
      await sendCloudLLMPrompt(openAIConfig, messages);
      const result = await sendCloudLLMPrompt(customConfig, messages);

      // Assert
      expect(result.content).toBe('Other provider response');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(fetchSpy.calls.argsFor(0)[0]).toBe(
        'https://api.openai.com/v1/chat/completions',
      );
      expect(fetchSpy.calls.argsFor(2)[0]).toBe(
        'https://api.openai.com/v1/chat/completions',
      );
      expect(requestBodyForCall(2).temperature).toBe(0.1);
    });

    it('should isolate learned state between different models', async () => {
      // Arrange
      const firstConfig = createConfig({ model: 'gpt-5-model-a' });
      const otherModelConfig = createConfig({ model: 'gpt-5-model-b' });
      fetchSpy.and.returnValues(
        Promise.resolve(
          mockFetchResponse({ error: { param: 'temperature' } }, 400),
        ),
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'Retry response' } }],
            model: 'gpt-5-model-a',
          }),
        ),
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'Other model response' } }],
            model: 'gpt-5-model-b',
          }),
        ),
      );

      // Act
      await sendCloudLLMPrompt(firstConfig, messages);
      const result = await sendCloudLLMPrompt(otherModelConfig, messages);

      // Assert
      expect(result.content).toBe('Other model response');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(requestBodyForCall(2).temperature).toBe(0.1);
    });

    it('should retain learned state when the parameter-free retry fails', async () => {
      // Arrange
      const config = createConfig({ model: 'gpt-5-failed-retry-learning' });
      fetchSpy.and.returnValues(
        Promise.resolve(
          mockFetchResponse({ error: { param: 'temperature' } }, 400),
        ),
        Promise.resolve(mockFetchResponse({}, 503, 'Retry unavailable')),
        Promise.resolve(
          mockFetchResponse({
            choices: [{ message: { content: 'Later response' } }],
            model: 'gpt-5-failed-retry-learning',
          }),
        ),
      );

      // Act
      const firstError: unknown = await sendCloudLLMPrompt(
        config,
        messages,
      ).catch((error: unknown) => error);
      const result = await sendCloudLLMPrompt(config, messages);

      // Assert
      expect(firstError).toEqual(jasmine.any(Error));
      expect(firstError).toEqual(
        jasmine.objectContaining({
          message: 'Cloud LLM API error (503): Retry unavailable',
        }),
      );
      expect(result.content).toBe('Later response');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(requestBodyForCall(2).temperature).toBeUndefined();
    });
  });

  // ── Error handling ─────────────────────────────────────────────────

  describe('error handling', () => {
    it('should throw descriptive error on HTTP 401 (unauthorized)', async () => {
      // Arrange
      const config = createConfig();
      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve('Invalid API key'),
        } as unknown as Response),
      );

      // Act & Assert
      await expectAsync(
        sendCloudLLMPrompt(config, messages),
      ).toBeRejectedWithError('Cloud LLM API error (401): Invalid API key');
    });

    it('should handle error response when body text extraction fails', async () => {
      // WHY: response.text() itself might fail; we should still get a useful error

      // Arrange
      const config = createConfig();
      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: false,
          status: 403,
          text: () => Promise.reject(new Error('stream error')),
        } as unknown as Response),
      );

      // Act & Assert
      await expectAsync(
        sendCloudLLMPrompt(config, messages),
      ).toBeRejectedWithError('Cloud LLM API error (403): ');
    });

    it('should throw timeout error when request exceeds 30 seconds', async () => {
      // WHY: We use AbortController to enforce a 30s timeout

      // Arrange
      const config = createConfig();
      const abortError = new DOMException(
        'The operation was aborted',
        'AbortError',
      );
      fetchSpy.and.returnValue(Promise.reject(abortError));

      // Act
      const request = sendCloudLLMPrompt(config, messages);

      // Assert
      await expectAsync(request).toBeRejectedWithError(
        'Cloud LLM request timed out after 30 seconds',
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should re-throw network errors as-is', async () => {
      // Arrange
      const config = createConfig();
      fetchSpy.and.returnValue(
        Promise.reject(new TypeError('Failed to fetch')),
      );

      // Act
      const request = sendCloudLLMPrompt(config, messages);

      // Assert
      await expectAsync(request).toBeRejectedWith(jasmine.any(TypeError));
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
