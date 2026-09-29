import { Injectable, Optional } from '@nestjs/common';
import { Semaphore } from '../../common/utils/semaphore';
import {
  ImageProcessor,
  ProcessedImage,
  Rendition,
} from './image-processor.port';
import {
  ImageTooLargeError,
  InvalidImageError,
  UnsupportedImageFormatError,
} from './image-processing.errors';

interface SharpToBufferResult {
  data: Buffer;
  info: { width: number; height: number; size: number };
}

interface SharpPipeline {
  rotate(): SharpPipeline;
  clone(): SharpPipeline;
  resize(options: {
    width: number;
    withoutEnlargement: boolean;
  }): SharpPipeline;
  webp(options: { quality: number }): SharpPipeline;
  toBuffer(options: { resolveWithObject: true }): Promise<SharpToBufferResult>;
  metadata(): Promise<{ format?: string }>;
}

interface SharpFactory {
  (input: Buffer, options?: { limitInputPixels?: number }): SharpPipeline;
  concurrency(threads: number): number;
  cache(enabled: boolean): void;
}

// sharp ships dual ESM/CJS type declarations; under this project's classic
// (Node10) module resolution, TypeScript resolves the package's "types"
// field to the ESM declaration file, which does not match the plain CJS
// function this module actually exports at runtime. A plain `require` call
// cast to a small local interface (covering only the API surface used
// below) sidesteps that mismatch entirely instead of fighting type
// resolution, while keeping every call site fully typed.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as SharpFactory;

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export interface SharpImageProcessorOptions {
  /** Max concurrent `process()` calls; other calls queue. */
  concurrency: number;
  /** Decompression-bomb guard: max decodable pixel count. */
  limitInputPixels: number;
  largeMaxWidth: number;
  thumbMaxWidth: number;
  largeQuality: number;
  thumbQuality: number;
}

const DEFAULT_OPTIONS: SharpImageProcessorOptions = {
  concurrency: 2,
  limitInputPixels: 50_000_000,
  largeMaxWidth: 1920,
  thumbMaxWidth: 480,
  largeQuality: 80,
  thumbQuality: 75,
};

/**
 * `ImageProcessor` adapter backed by `sharp`/libvips. Resource limits are
 * tuned for a shared 8 GB box (see design.md's "sharp resource limits"
 * decision): threads pinned to 1, no retained decode cache, and a
 * process-wide semaphore bounding concurrent decodes.
 */
@Injectable()
export class SharpImageProcessor implements ImageProcessor {
  private readonly options: SharpImageProcessorOptions;
  private readonly semaphore: Semaphore;

  constructor(@Optional() options?: Partial<SharpImageProcessorOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.semaphore = new Semaphore(this.options.concurrency);
    sharp.concurrency(1);
    sharp.cache(false);
  }

  async process(input: Buffer): Promise<ProcessedImage> {
    return this.semaphore.run(() => this.processUnsafe(input));
  }

  private async processUnsafe(input: Buffer): Promise<ProcessedImage> {
    const metadata = await this.decodeMetadata(input);

    const format = metadata.format;
    if (!format || !ACCEPTED_FORMATS.has(format)) {
      throw new UnsupportedImageFormatError(format ?? 'unknown');
    }

    const base = sharp(input, {
      limitInputPixels: this.options.limitInputPixels,
    }).rotate();

    const [large, thumb] = await Promise.all([
      this.renderRendition(
        base.clone(),
        this.options.largeMaxWidth,
        this.options.largeQuality,
      ),
      this.renderRendition(
        base.clone(),
        this.options.thumbMaxWidth,
        this.options.thumbQuality,
      ),
    ]);

    return {
      sourceFormat: format as 'jpeg' | 'png' | 'webp',
      large,
      thumb,
    };
  }

  private async decodeMetadata(input: Buffer): Promise<{ format?: string }> {
    try {
      return await sharp(input, {
        limitInputPixels: this.options.limitInputPixels,
      }).metadata();
    } catch (err) {
      const message = (err as Error).message ?? '';
      if (/pixel limit/i.test(message)) {
        throw new ImageTooLargeError();
      }
      throw new InvalidImageError();
    }
  }

  private async renderRendition(
    pipeline: SharpPipeline,
    maxWidth: number,
    quality: number,
  ): Promise<Rendition> {
    const { data, info } = await pipeline
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });

    return { data, width: info.width, height: info.height, bytes: info.size };
  }
}
