import { GeminiNanoGenerateOptions } from '../../../native/android-native-calls-plugin';
import { sendGeminiNanoPrompt } from '../llm-communication.service';

describe('llm-communication.service', () => {
  describe('sendGeminiNanoPrompt', () => {
    let logger: jasmine.SpyObj<{
      error: (msg: string) => void;
      log: (msg: string) => void;
    }>;

    beforeEach(() => {
      logger = jasmine.createSpyObj('logger', ['error', 'log']);
    });

    it('returns the generated text', async () => {
      const generate = jasmine
        .createSpy('generate')
        .and.resolveTo({ text: 'FILTER' });

      const result = await sendGeminiNanoPrompt(
        'What roast type is this coffee intended for?',
        { logger },
        generate,
      );

      expect(result).toBe('FILTER');
    });

    it('passes prompt and instructions to the native call', async () => {
      const generate = jasmine
        .createSpy('generate')
        .and.resolveTo({ text: 'en' });

      await sendGeminiNanoPrompt(
        'Detect the language',
        { instructions: 'Answer with an ISO code' },
        generate,
      );

      expect(generate).toHaveBeenCalledOnceWith({
        prompt: 'Detect the language',
        instructions: 'Answer with an ISO code',
      } satisfies GeminiNanoGenerateOptions);
    });

    it('returns an empty string and logs when the native call fails', async () => {
      const generate = jasmine
        .createSpy('generate')
        .and.rejectWith(new Error('AICore busy'));

      const result = await sendGeminiNanoPrompt('prompt', { logger }, generate);

      expect(result).toBe('');
      expect(logger.error).toHaveBeenCalledWith(
        jasmine.stringContaining('AICore busy'),
      );
    });

    it('returns an empty string when the native call times out', async () => {
      jasmine.clock().install();
      try {
        const generate = jasmine
          .createSpy('generate')
          .and.returnValue(new Promise<{ text: string }>(() => undefined));

        const resultPromise = sendGeminiNanoPrompt(
          'prompt',
          { timeoutMs: 1000, logger },
          generate,
        );
        jasmine.clock().tick(1000);

        expect(await resultPromise).toBe('');
        expect(logger.log).toHaveBeenCalledWith('LLM timeout');
      } finally {
        jasmine.clock().uninstall();
      }
    });
  });
});
