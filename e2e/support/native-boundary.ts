/**
 * Browser-side half of the native boundary. Serialized by Playwright into an init script, so it
 * must not reference anything outside its own body.
 *
 * Capacitor's core reuses a `window.Capacitor` that already exists (that is how the native bridge
 * injects itself) and assigns `registerPlugin` onto it. Trapping that assignment lets us wrap every
 * plugin proxy without touching app code or switching the platform away from `web`:
 * - unmocked plugins keep their real web implementation; calls are only recorded;
 * - mocked plugins are answered by the Node-side `native` fixture through `__bqNativeCall`.
 * Cordova plugins are plain globals (`ble`, `NfcPlugin`, …); reads of the listed ones are recorded.
 */
export function installNativeBoundary(config: {
  tracedCordovaGlobals: string[];
}): void {
  interface Listener {
    plugin: string;
    eventName: string;
    callback: (data: unknown) => void;
  }
  type Envelope =
    | { ok: true; value: unknown }
    | { ok: false; message: string; code?: string };
  type CapacitorProxy = Record<string | symbol, unknown>;
  type RegisterPlugin = (name: string, impls?: unknown) => CapacitorProxy;

  const win = window as unknown as Record<string, unknown>;
  const mocked = new Set<string>();
  const listeners = new Map<number, Listener>();
  const state = {
    installed: false,
    mocked,
    calls: [] as { plugin: string; method: string; mocked: boolean }[],
    cordovaGlobalsRead: [] as string[],
    listeners,
  };
  win['__bqNative'] = state;
  let listenerSeq = 0;

  const callNode = (plugin: string, method: string, options: unknown) =>
    (
      win['__bqNativeCall'] as (
        p: string,
        m: string,
        o: unknown,
      ) => Promise<Envelope>
    )(plugin, method, options);

  const mockedMethod = (plugin: string, method: string) => {
    if (method === 'addListener') {
      return (eventName: string, callback: (data: unknown) => void) => {
        state.calls.push({
          plugin,
          method: `addListener(${eventName})`,
          mocked: true,
        });
        const id = ++listenerSeq;
        listeners.set(id, { plugin, eventName, callback });
        return Promise.resolve({
          remove: async () => void listeners.delete(id),
        });
      };
    }
    if (method === 'removeAllListeners') {
      return async () => {
        state.calls.push({ plugin, method, mocked: true });
        for (const [id, l] of listeners)
          if (l.plugin === plugin) listeners.delete(id);
      };
    }
    return async (options?: unknown) => {
      state.calls.push({ plugin, method, mocked: true });
      const result = await callNode(plugin, method, options ?? null);
      if (result.ok) return result.value;
      // Same shape as Capacitor's CapacitorException, which app code inspects via message/code.
      throw Object.assign(new Error(result.message), { code: result.code });
    };
  };

  let realRegister: RegisterPlugin | undefined;
  const register: RegisterPlugin = (name, impls) => {
    const real = realRegister!(name, impls);
    return new Proxy(real, {
      get(target, prop) {
        // Not plugin methods: thenable checks, React/serialization probes.
        if (
          typeof prop !== 'string' ||
          ['then', '$$typeof', 'toJSON'].includes(prop)
        ) {
          return target[prop];
        }
        if (mocked.has(name)) return mockedMethod(name, prop);
        const method = target[prop] as (...args: unknown[]) => unknown;
        return (...args: unknown[]) => {
          state.calls.push({ plugin: name, method: prop, mocked: false });
          return method(...args);
        };
      },
    });
  };

  const capacitor = {};
  Object.defineProperty(capacitor, 'registerPlugin', {
    configurable: true,
    enumerable: true,
    get: () => register,
    set: (fn: RegisterPlugin) => {
      realRegister = fn;
      state.installed = true;
    },
  });
  win['Capacitor'] = capacitor;

  for (const name of config.tracedCordovaGlobals) {
    Object.defineProperty(window, name, {
      configurable: true,
      get: () => {
        state.cordovaGlobalsRead.push(name);
        return undefined;
      },
    });
  }
}

/** Runs in the page after `installNativeBoundary`: routes a plugin to the Node-side mock. */
export function markPluginMocked(plugin: string): void {
  const state = (window as unknown as Record<string, unknown>)[
    '__bqNative'
  ] as {
    mocked: Set<string>;
  };
  state.mocked.add(plugin);
}

/** Runs in the page: delivers an event to the app's listeners of a mocked plugin. */
export function emitNativeEvent(args: {
  plugin: string;
  eventName: string;
  data: unknown;
}): number {
  const state = (window as unknown as Record<string, unknown>)[
    '__bqNative'
  ] as {
    listeners: Map<
      number,
      { plugin: string; eventName: string; callback: (d: unknown) => void }
    >;
  };
  let delivered = 0;
  for (const l of state.listeners.values()) {
    if (l.plugin === args.plugin && l.eventName === args.eventName) {
      l.callback(args.data);
      delivered++;
    }
  }
  return delivered;
}
