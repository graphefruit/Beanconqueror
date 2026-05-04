import { Injectable } from '@angular/core';
import { CameraServicePort } from '../ports/camera-service.port';
import { ImageOptions, Photo } from '../types';

@Injectable()
export class WebCameraAdapter implements CameraServicePort {
  isSupported(): boolean {
    return false;
  }

  async getPhoto(_options: ImageOptions): Promise<Photo> {
    throw new Error('Feature requires mobile app');
  }
}
