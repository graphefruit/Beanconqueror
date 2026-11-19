// The plugin object is a proxy that cannot be spied on; the web
// implementation behind it can.
import { CapgoLLMWeb } from '@capgo/capacitor-llm/dist/esm/web';

import { sendLLMPrompt } from '../llm-communication.service';

describe('sendLLMPrompt', () => {
  it('returns the whole answer but logs only the start of prompt and answer', async () => {
    const prompt = 'Label: Roastery Example, Ethiopia Guji. '.repeat(10);
    const answer =
      '{"name":"Ethiopia Guji","roaster":"Roastery Example"}'.repeat(4);
    const listeners = new Map<string, (event: { text?: string }) => void>();
    spyOn(CapgoLLMWeb.prototype, 'setModel').and.resolveTo();
    spyOn(CapgoLLMWeb.prototype, 'createChat').and.resolveTo({ id: 'chat' });
    spyOn(CapgoLLMWeb.prototype, 'addListener').and.callFake(((
      eventName: string,
      callback: (event: { text?: string }) => void,
    ) => {
      listeners.set(eventName, callback);
      return Promise.resolve({ remove: () => Promise.resolve() });
    }) as never);
    spyOn(CapgoLLMWeb.prototype, 'sendMessage').and.callFake(() => {
      listeners.get('textFromAi')({ text: answer });
      listeners.get('aiFinished')({});
      return Promise.resolve();
    });
    const logger = {
      log: jasmine.createSpy('log'),
      error: jasmine.createSpy('error'),
    };

    expect(await sendLLMPrompt(prompt, { logger })).toBe(answer);

    expect(logger.log.calls.allArgs()).toEqual([
      [
        `[Apple Intelligence] prompt: ${prompt.slice(0, 100)}… (${prompt.length} chars)`,
      ],
      [
        `[Apple Intelligence] response: ${answer.slice(0, 100)}… (${answer.length} chars)`,
      ],
    ]);
  });
});
