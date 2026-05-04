import { CameraDirection, CameraResultType, CameraSource, Photo } from '@capacitor/camera';

export type ImageOptions = {
  correctOrientation: boolean;
  direction: CameraDirection;
  quality: number;
  resultType: CameraResultType;
  saveToGallery: boolean;
  source: CameraSource;
};

export type { Photo };
