export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const validateAvatarFile = (file: File): string | null => {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return 'Choose a JPEG, PNG or WebP image.';
  }
  if (file.size === 0) {
    return 'The selected image is empty. Choose another file.';
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return 'Profile picture must be 5 MB or smaller.';
  }
  return null;
};

export const loadImage = (source: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected image could not be read.'));
    image.src = source;
  });

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> =>
  new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });

export const createCroppedAvatar = async (source: string, crop: PixelCrop): Promise<Blob> => {
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Image cropping is not supported in this browser.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE,
  );

  const webp = await canvasToBlob(canvas, 'image/webp', 0.9);
  const blob = webp ?? (await canvasToBlob(canvas, 'image/png', 0.9));
  if (!blob) {
    throw new Error('The cropped image could not be created.');
  }
  return blob;
};

export const avatarFileFromBlob = (blob: Blob): File => {
  const type = blob.type || 'image/webp';
  const extension = type === 'image/png' ? 'png' : 'webp';
  return new File([blob], `avatar.${extension}`, { type });
};
