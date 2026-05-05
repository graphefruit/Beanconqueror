import { Provider } from '@angular/core';
import { WebCameraAdapter } from '../adapters/web-camera.adapter';
import { WebScaleConnectionAdapter } from '../adapters/web-scale-connection.adapter';
import { WebWakeLockAdapter } from '../adapters/web-wake-lock.adapter';
import { CAMERA_SERVICE_PORT } from '../ports/camera-service.port';
import { SCALE_CONNECTION_PORT } from '../ports/scale-connection.port';
import { WAKE_LOCK_PORT } from '../ports/wake-lock.port';

export const providePlatformPorts = (): Provider[] => {
  return [
    { provide: CAMERA_SERVICE_PORT, useClass: WebCameraAdapter },
    { provide: WAKE_LOCK_PORT, useClass: WebWakeLockAdapter },
    { provide: SCALE_CONNECTION_PORT, useClass: WebScaleConnectionAdapter },
  ];
};
