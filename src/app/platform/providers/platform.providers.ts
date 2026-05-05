import { Provider } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorCameraAdapter } from '../adapters/capacitor-camera.adapter';
import { CapacitorScaleConnectionAdapter } from '../adapters/capacitor-scale-connection.adapter';
import { CapacitorWakeLockAdapter } from '../adapters/capacitor-wake-lock.adapter';
import { WebCameraAdapter } from '../adapters/web-camera.adapter';
import { WebWakeLockAdapter } from '../adapters/web-wake-lock.adapter';
import { CAMERA_SERVICE_PORT } from '../ports/camera-service.port';
import { SCALE_CONNECTION_PORT } from '../ports/scale-connection.port';
import { WAKE_LOCK_PORT } from '../ports/wake-lock.port';

export const providePlatformPorts = (): Provider[] => {
  const native = Capacitor.isNativePlatform();
  return [
    { provide: CAMERA_SERVICE_PORT, useClass: native ? CapacitorCameraAdapter : WebCameraAdapter },
    { provide: WAKE_LOCK_PORT, useClass: native ? CapacitorWakeLockAdapter : WebWakeLockAdapter },
    { provide: SCALE_CONNECTION_PORT, useClass: CapacitorScaleConnectionAdapter },
  ];
};
