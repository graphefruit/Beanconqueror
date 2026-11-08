import { registerPlugin } from '@capacitor/core';

interface VoiceOverMagicTapPlugin {
  setEnabled(options: { enabled: boolean }): Promise<void>;
}

export const VoiceOverMagicTap =
  registerPlugin<VoiceOverMagicTapPlugin>('VoiceOverMagicTap');
