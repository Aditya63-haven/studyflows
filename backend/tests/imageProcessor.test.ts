import sharp from 'sharp';
import { AVATAR_OUTPUT_SIZE } from '../src/config/avatar';
import { ValidationError } from '../src/errors';
import { ImageProcessor } from '../src/services/ImageProcessor';

const createImage = (format: 'jpeg' | 'png' | 'webp' | 'gif') =>
  sharp({
    create: {
      width: 900,
      height: 600,
      channels: 4,
      background: { r: 32, g: 180, b: 130, alpha: 1 },
    },
  })
    [format]()
    .toBuffer();

describe('ImageProcessor', () => {
  const processor = new ImageProcessor();

  it.each(['jpeg', 'png', 'webp'] as const)(
    'normalizes a valid %s image into a square WebP',
    async (format) => {
      const input = await createImage(format);
      const output = await processor.process(input);
      const metadata = await sharp(output).metadata();

      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(AVATAR_OUTPUT_SIZE);
      expect(metadata.height).toBe(AVATAR_OUTPUT_SIZE);
    },
  );

  it('rejects non-image bytes even when they arrive with an image MIME type', async () => {
    await expect(processor.process(Buffer.from('not an image'))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('rejects SVG content', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>',
    );
    await expect(processor.process(svg)).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects GIF content', async () => {
    const gif = await createImage('gif');
    await expect(processor.process(gif)).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects empty input', async () => {
    await expect(processor.process(Buffer.alloc(0))).rejects.toBeInstanceOf(ValidationError);
  });
});
