import { RequestHandler } from 'express';
import multer from 'multer';
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from '../config/avatar';
import { PayloadTooLargeError, ValidationError } from '../errors';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: AVATAR_MAX_BYTES,
    files: 1,
    fields: 0,
    parts: 2,
  },
  fileFilter: (_req, file, callback) => {
    const accepted = AVATAR_MIME_TYPES as readonly string[];
    if (!accepted.includes(file.mimetype)) {
      callback(new ValidationError('Profile picture must be a JPEG, PNG or WebP image'));
      return;
    }
    callback(null, true);
  },
});

const singleAvatar = upload.single('avatar');

/**
 * Parses the `avatar` multipart field and maps Multer failures into AppErrors.
 */
export const avatarUpload: RequestHandler = (req, res, next) => {
  singleAvatar(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new PayloadTooLargeError('Profile picture must be 5 MB or smaller'));
        return;
      }
      next(new ValidationError(`Invalid profile picture upload: ${error.code}`));
      return;
    }

    next(error);
  });
};
