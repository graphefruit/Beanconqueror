import { registerPlugin } from '@capacitor/core';

interface WidgetPlugin {
  /** Keeps the snapshot, as JSON, where the widgets read it. */
  setSnapshot(options: { snapshot: string }): Promise<void>;
  /** Has the widgets on the home screen drawn again. */
  reload(): Promise<void>;
}

export const Widget = registerPlugin<WidgetPlugin>('Widget');
