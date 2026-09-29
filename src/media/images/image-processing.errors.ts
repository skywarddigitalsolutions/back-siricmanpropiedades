/**
 * Framework-free errors thrown by `ImageProcessor` implementations. Kept
 * free of any NestJS/HTTP dependency so the processing layer stays
 * infrastructure-agnostic; the service layer maps these to HTTP exceptions.
 */

/** The input bytes could not be decoded as an image at all. */
export class InvalidImageError extends Error {
  constructor(message = 'Could not decode the uploaded file as an image') {
    super(message);
    this.name = 'InvalidImageError';
  }
}

/** The input decoded, but its format is not one of the accepted formats. */
export class UnsupportedImageFormatError extends Error {
  constructor(public readonly detectedFormat: string) {
    super(`Unsupported image format: ${detectedFormat}`);
    this.name = 'UnsupportedImageFormatError';
  }
}

/** The input's decoded pixel count exceeds the configured safety limit. */
export class ImageTooLargeError extends Error {
  constructor(message = 'Image exceeds the maximum allowed pixel count') {
    super(message);
    this.name = 'ImageTooLargeError';
  }
}
