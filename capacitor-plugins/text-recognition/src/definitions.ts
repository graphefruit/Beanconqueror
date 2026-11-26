/** Pixel coordinates in the decoded image, origin at the top left. */
export interface BoundingBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface TextBase {
  text: string;
  boundingBox: BoundingBox;
  recognizedLanguage: string;
}

export type Element = TextBase;

export interface Line extends TextBase {
  elements: Element[];
}

export interface Block extends TextBase {
  lines: Line[];
}

export interface TextDetectionResult {
  text: string;
  blocks: Block[];
}

export interface DetectTextOptions {
  /** JPEG or PNG as raw base64, without a data URL prefix. */
  base64Image: string;
}

export interface TextRecognitionPlugin {
  /** Rejects when the image is missing or cannot be decoded. */
  detectText(options: DetectTextOptions): Promise<TextDetectionResult>;
}
