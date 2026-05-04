import { Injectable } from '@angular/core';
import { Camera } from '@capacitor/camera';
import { CameraServicePort } from '../ports/camera-service.port';
import { ImageOptions, Photo } from '../types';

@Injectable()
export class CapacitorCameraAdapter implements CameraServicePort {
  isSupported(): boolean {
    return true;
  }

  async getPhoto(options: ImageOptions): Promise<Photo> {
    return Camera.getPhoto(options);
  }
}
