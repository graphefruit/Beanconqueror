import { registerPlugin } from '@capacitor/core';

import type { TextRecognitionPlugin } from './definitions';

export const TextRecognition =
  registerPlugin<TextRecognitionPlugin>('TextRecognition');

export * from './definitions';
