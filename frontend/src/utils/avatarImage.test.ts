import { describe, expect, it } from 'vitest';
import { MAX_AVATAR_BYTES, validateAvatarFile } from './avatarImage';

const fileOf = (type: string, size: number): File => {
  const file = new File(['avatar'], 'avatar.png', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('validateAvatarFile', () => {
  it('accepts supported images under the limit', () => {
    expect(validateAvatarFile(fileOf('image/jpeg', 1024))).toBeNull();
    expect(validateAvatarFile(fileOf('image/png', 1024))).toBeNull();
    expect(validateAvatarFile(fileOf('image/webp', 1024))).toBeNull();
  });

  it('rejects unsupported formats', () => {
    expect(validateAvatarFile(fileOf('image/svg+xml', 1024))).toBe(
      'Choose a JPEG, PNG or WebP image.',
    );
    expect(validateAvatarFile(fileOf('image/gif', 1024))).toBe('Choose a JPEG, PNG or WebP image.');
  });

  it('rejects empty and oversized images', () => {
    expect(validateAvatarFile(fileOf('image/png', 0))).toBe(
      'The selected image is empty. Choose another file.',
    );
    expect(validateAvatarFile(fileOf('image/png', MAX_AVATAR_BYTES + 1))).toBe(
      'Profile picture must be 5 MB or smaller.',
    );
  });
});
