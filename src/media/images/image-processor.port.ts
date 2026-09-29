export const IMAGE_PROCESSOR = Symbol('IMAGE_PROCESSOR');

export interface Rendition {
  data: Buffer;
  width: number;
  height: number;
  bytes: number;
}

export interface ProcessedImage {
  sourceFormat: 'jpeg' | 'png' | 'webp';
  large: Rendition;
  thumb: Rendition;
}

/**
 * Decodes, validates, and re-encodes an uploaded image into the two
 * supported renditions. Throws one of the errors in
 * `image-processing.errors.ts` on any invalid input.
 */
export interface ImageProcessor {
  process(input: Buffer): Promise<ProcessedImage>;
}
