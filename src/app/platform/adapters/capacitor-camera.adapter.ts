import { Injectable } from '@angular/core';
import { Camera } from '@capacitor/camera';
import { CameraServicePort } from '../ports/camera-service.port';
import { CameraPluginPermissions, ImageOptions, PermissionStatus, Photo } from '../types';

@Injectable()
export class CapacitorCameraAdapter implements CameraServicePort {
  isSupported(): boolean {
    return true;
  }

  async getPhoto(options: ImageOptions): Promise<Photo> {
    return Camera.getPhoto(options);
  }

  async checkPermissions(): Promise<PermissionStatus> {
    return Camera.checkPermissions();
  }

  async requestPermissions(permissions?: CameraPluginPermissions): Promise<PermissionStatus> {
    return Camera.requestPermissions(permissions);
  }
}
