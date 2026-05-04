import { Injectable } from '@angular/core';
import { CameraServicePort } from '../ports/camera-service.port';
import { CameraPluginPermissions, ImageOptions, PermissionStatus, Photo } from '../types';

@Injectable()
export class WebCameraAdapter implements CameraServicePort {
  isSupported(): boolean {
    return false;
  }

  async getPhoto(_options: ImageOptions): Promise<Photo> {
    throw new Error('Feature requires mobile app');
  }

  async checkPermissions(): Promise<PermissionStatus> {
    return { camera: 'denied', photos: 'denied' };
  }

  async requestPermissions(_permissions?: CameraPluginPermissions): Promise<PermissionStatus> {
    return { camera: 'denied', photos: 'denied' };
  }
}
