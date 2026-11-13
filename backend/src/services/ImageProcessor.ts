import sharp from 'sharp';
import { AVATAR_OUTPUT_SIZE } from '../config/avatar';
import { ValidationError } from '../errors';

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MAX_INPUT_PIXELS = 40_000_000;
const INVALID_IMAGE_MESSAGE = 'Profile picture must be a valid JPEG, PNG or WebP image';

/**
 * Validates uploaded image bytes and normalizes them into a square WebP.
 */
export class ImageProcessor {
  public async process(input: Buffer): Promise<Buffer> {
    if (!Buffer.isBuffer(input) || input.length === 0) {
      throw new ValidationError('Profile picture is required');
    }

    try {
      const metadata = await sharp(input, {
        failOn: 'error',
        limitInputPixels: MAX_INPUT_PIXELS,
      }).metadata();

      if (
        !metadata.format ||
        !ACCEPTED_FORMATS.has(metadata.format) ||
        !metadata.width ||
        !metadata.height ||
        (metadata.pages !== undefined && metadata.pages > 1)
      ) {
        throw new ValidationError(INVALID_IMAGE_MESSAGE);
      }

      return await sharp(input, {
        failOn: 'error',
        limitInputPixels: MAX_INPUT_PIXELS,
      })
        .rotate()
        .resize(AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE, {
          fit: 'cover',
          position: 'centre',
        })
        .webp({ quality: 85, effort: 4 })
        .toBuffer();
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(INVALID_IMAGE_MESSAGE);
    }
  }
}
