import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

interface QuickActionPlugin {
  addListener(
    eventName: 'quickAction',
    listener: (event: { type: string }) => void,
  ): Promise<PluginListenerHandle>;
}

export const QuickAction = registerPlugin<QuickActionPlugin>('QuickAction');
