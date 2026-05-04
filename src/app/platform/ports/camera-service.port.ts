import { InjectionToken } from '@angular/core';
import { ImageOptions, Photo } from '../types';

export interface CameraServicePort {
  isSupported(): boolean;
  getPhoto(options: ImageOptions): Promise<Photo>;
}

export const CAMERA_SERVICE_PORT = new InjectionToken<CameraServicePort>('CAMERA_SERVICE_PORT');
