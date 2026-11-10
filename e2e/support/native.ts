import type { Page, TestInfo } from '@playwright/test';

import {
  emitNativeEvent,
  installNativeBoundary,
  markPluginMocked,
} from './native-boundary';

/** Cordova plugin globals whose reads are recorded in the native trace. */
const TRACED_CORDOVA_GLOBALS = ['ble', 'NfcPlugin', 'TTS', 'sqlitePlugin'];

type Envelope =
  | { ok: true; value: unknown }
  | { ok: false; message: string; code?: string };

type AnyMethod = (...args: never[]) => Promise<unknown>;
type ScriptableMethod<P> = {
  [K in keyof P]: K extends 'addListener' | 'removeAllListeners'
    ? never
    : P[K] extends AnyMethod
      ? K
      : never;
}[keyof P];

/**
 * Typed answers for a Capacitor plugin, e.g. `NativeHandlers<CameraPlugin>`. Return the success
 * value or throw `NativeError` for cancellation/permission failures. Methods without a handler are
 * unexpected: the call rejects with `UNIMPLEMENTED` and the test fails.
 */
export type NativeHandlers<P> = {
  [K in ScriptableMethod<P>]?: P[K] extends (
    ...args: infer A
  ) => Promise<infer R>
    ? (options: A[0]) => R | Promise<R>
    : never;
};

/** A plugin rejection as the app sees it from a native plugin (`message` and `code`). */
export class NativeError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

export interface NativeCall {
  plugin: string;
  method: string;
  mocked: boolean;
}

interface PageState {
  installed: boolean;
  calls: NativeCall[];
  cordovaGlobalsRead: string[];
}

/**
 * The Capacitor/Cordova boundary of the app under test. Everything above it (routing, services,
 * IndexedDB) stays real; only plugins mocked here are faked, and only inside this browser context.
 * Lives in `e2e/` and is injected by Playwright, so production builds cannot contain it.
 */
export class NativeBoundary {
  private readonly handlers = new Map<
    string,
    Record<string, (options: unknown) => unknown>
  >();
  private readonly problems: string[] = [];

  constructor(private readonly page: Page) {}

  async install(): Promise<void> {
    await this.page.exposeFunction(
      '__bqNativeCall',
      (plugin: string, method: string, options: unknown) =>
        this.answer(plugin, method, options),
    );
    await this.page.addInitScript(installNativeBoundary, {
      tracedCordovaGlobals: TRACED_CORDOVA_GLOBALS,
    });
  }

  /** Replaces a Capacitor plugin with `handlers`. Call before the first `page.goto`. */
  async mockCapacitor<P>(
    plugin: string,
    handlers: NativeHandlers<P>,
  ): Promise<void> {
    if (this.page.url() !== 'about:blank') {
      throw new Error(
        `Mock "${plugin}" before navigating; the app registers plugins on boot.`,
      );
    }
    this.handlers.set(
      plugin,
      handlers as Record<string, (options: unknown) => unknown>,
    );
    await this.page.addInitScript(markPluginMocked, plugin);
  }

  /** Fires a plugin event at the app's listeners; fails if the app is not listening. */
  async emit(plugin: string, eventName: string, data: unknown): Promise<void> {
    const delivered = await this.page.evaluate(emitNativeEvent, {
      plugin,
      eventName,
      data,
    });
    if (delivered === 0) {
      throw new Error(
        `No listener for ${plugin} "${eventName}"; the app did not subscribe.`,
      );
    }
  }

  /** Events of mocked plugins the app still listens to; use to assert listener cleanup. */
  async activeListeners(plugin: string): Promise<string[]> {
    return this.page.evaluate((name) => {
      const state = (window as unknown as Record<string, unknown>)[
        '__bqNative'
      ] as {
        listeners: Map<number, { plugin: string; eventName: string }>;
      };
      return [...state.listeners.values()]
        .filter((l) => l.plugin === name)
        .map((l) => l.eventName);
    }, plugin);
  }

  async calls(): Promise<NativeCall[]> {
    return (await this.state())?.calls ?? [];
  }

  /** Attaches the native trace to the report and returns boundary violations. */
  async finish(testInfo: TestInfo): Promise<string[]> {
    const state = await this.state();
    if (state) {
      if (!state.installed) {
        this.problems.push(
          'native boundary not installed: @capacitor/core no longer adopts a pre-existing window.Capacitor',
        );
      }
      await testInfo.attach('native-calls', {
        body: JSON.stringify(
          {
            capacitor: state.calls,
            cordovaGlobalsRead: [...new Set(state.cordovaGlobalsRead)],
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });
    }
    return this.problems;
  }

  private async state(): Promise<PageState | undefined> {
    if (this.page.isClosed() || this.page.url() === 'about:blank')
      return undefined;
    return this.page.evaluate(() => {
      const s = (window as unknown as Record<string, unknown>)[
        '__bqNative'
      ] as PageState;
      return {
        installed: s.installed,
        calls: s.calls,
        cordovaGlobalsRead: s.cordovaGlobalsRead,
      };
    });
  }

  private async answer(
    plugin: string,
    method: string,
    options: unknown,
  ): Promise<Envelope> {
    const handler = this.handlers.get(plugin)?.[method];
    if (!handler) {
      this.problems.push(
        `unexpected native call: ${plugin}.${method}(${JSON.stringify(options)})`,
      );
      return {
        ok: false,
        message: `"${plugin}.${method}()" is not mocked`,
        code: 'UNIMPLEMENTED',
      };
    }
    try {
      return { ok: true, value: await handler(options) };
    } catch (error) {
      if (error instanceof NativeError) {
        return { ok: false, message: error.message, code: error.code };
      }
      throw error;
    }
  }
}
