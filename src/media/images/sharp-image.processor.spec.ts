import { SharpImageProcessor } from './sharp-image.processor';
import {
  ImageTooLargeError,
  InvalidImageError,
  UnsupportedImageFormatError,
} from './image-processing.errors';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');

async function makeJpegWithOrientation(
  width: number,
  height: number,
  orientation: number,
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 50, b: 50 },
    },
  })
    .jpeg()
    .withMetadata({ orientation })
    .toBuffer();
}

async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 10, b: 10 } },
  })
    .png()
    .toBuffer();
}

async function makeWebp(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 1, g: 2, b: 3 } },
  })
    .webp()
    .toBuffer();
}

async function makeGif(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 1, g: 1, b: 1 } },
  })
    .gif()
    .toBuffer();
}

describe('SharpImageProcessor', () => {
  it('auto-orients a rotated JPEG and produces upright large/thumb renditions', async () => {
    const processor = new SharpImageProcessor();
    const input = await makeJpegWithOrientation(2400, 1200, 6);

    const result = await processor.process(input);

    // Orientation 6 (rotate 90 CW) swaps the physical dimensions once
    // auto-orient is applied: the upright image is 1200x2400, not 2400x1200.
    expect(result.large.width).toBe(1200);
    expect(result.large.height).toBe(2400);
    expect(result.thumb.width).toBe(480);
    expect(result.thumb.height).toBe(960);

    const largeMeta = await sharp(result.large.data).metadata();
    const thumbMeta = await sharp(result.thumb.data).metadata();
    expect(largeMeta.exif).toBeUndefined();
    expect(largeMeta.icc).toBeUndefined();
    expect(thumbMeta.exif).toBeUndefined();
    expect(thumbMeta.icc).toBeUndefined();
  });

  it('does not upscale a source image narrower than the target widths', async () => {
    const processor = new SharpImageProcessor();
    const input = await makePng(300, 200);

    const result = await processor.process(input);

    expect(result.large.width).toBe(300);
    expect(result.large.height).toBe(200);
    expect(result.thumb.width).toBe(300);
    expect(result.thumb.height).toBe(200);
  });

  it('accepts a WebP input', async () => {
    const processor = new SharpImageProcessor();
    const input = await makeWebp(640, 480);

    const result = await processor.process(input);

    expect(result.sourceFormat).toBe('webp');
    expect(result.large.width).toBe(640);
  });

  it('rejects a valid GIF with UnsupportedImageFormatError', async () => {
    const processor = new SharpImageProcessor();
    const input = await makeGif(100, 100);

    await expect(processor.process(input)).rejects.toBeInstanceOf(
      UnsupportedImageFormatError,
    );
  });

  it('rejects undecodable random bytes with InvalidImageError', async () => {
    const processor = new SharpImageProcessor();
    const random = Buffer.from(
      Array.from({ length: 256 }, () => Math.floor(Math.random() * 256)),
    );

    await expect(processor.process(random)).rejects.toBeInstanceOf(
      InvalidImageError,
    );
  });

  it('rejects an image exceeding an injected small pixel limit with ImageTooLargeError', async () => {
    const processor = new SharpImageProcessor({ limitInputPixels: 1000 });
    const input = await makePng(300, 200); // 60,000 px > 1,000 px limit

    await expect(processor.process(input)).rejects.toBeInstanceOf(
      ImageTooLargeError,
    );
  });
});
