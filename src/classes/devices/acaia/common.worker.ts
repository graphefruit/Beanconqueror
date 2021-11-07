import {DEBUG, WorkerResult, WorkerResultType} from './common';

export function log(...args) {
  if (DEBUG) {
    self.postMessage({type: WorkerResultType.LOG, data: args} as WorkerResult);
  }
}
