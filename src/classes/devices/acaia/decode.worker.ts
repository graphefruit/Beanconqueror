/// <reference lib="webworker" />

import { DEBUG } from '../common/constants';
import {
  WorkerResult,
  DecoderResultType,
} from './common';

import {Decoder} from './decoder';

function log(...args) {
  if (DEBUG) {
    self.postMessage({type: DecoderResultType.LOG, data: args} as WorkerResult);
  }
}

const acaia = new Decoder(log);

self.addEventListener('message', ({data}: MessageEvent) => {
  if (data instanceof ArrayBuffer) {
    const result = acaia.process(data);
    if (result) {
      self.postMessage(result);
    }
  }
});

