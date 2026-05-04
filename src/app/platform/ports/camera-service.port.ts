import { InjectionToken } from '@angular/core';
import { CameraPluginPermissions, ImageOptions, PermissionStatus, Photo } from '../types';

export interface CameraServicePort {
  isSupported(): boolean;
  getPhoto(options: ImageOptions): Promise<Photo>;
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(permissions?: CameraPluginPermissions): Promise<PermissionStatus>;
}

export const CAMERA_SERVICE_PORT = new InjectionToken<CameraServicePort>('CAMERA_SERVICE_PORT');
