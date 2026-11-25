import {
  registerPlugin,
  WebPlugin,
  type PluginListenerHandle,
} from '@capacitor/core';

interface QuickActionPlugin {
  addListener(
    eventName: 'quickAction',
    listener: (event: { type: string }) => void,
  ): Promise<PluginListenerHandle>;
}

// Home screen quick actions exist only in the iOS app; in Safari the listener never fires.
export const QuickAction = registerPlugin<QuickActionPlugin>('QuickAction', {
  web: new WebPlugin(),
});
