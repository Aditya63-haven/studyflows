import { RequestHandler } from 'express';
import multer from 'multer';
import { DOCUMENT_FORMATS } from '../domain/entities/StudyDocument';
import { PayloadTooLargeError, ValidationError } from '../errors';

export const createDocumentUpload = (maxBytes: number): RequestHandler => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxBytes,
      files: 1,
      fields: 0,
      parts: 2,
    },
    fileFilter: (_req, file, callback) => {
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      if (
        !extension ||
        !DOCUMENT_FORMATS.includes(extension as (typeof DOCUMENT_FORMATS)[number])
      ) {
        callback(new ValidationError('Upload a PDF, DOCX, TXT or Markdown file'));
        return;
      }
      callback(null, true);
    },
  });

  const singleDocument = upload.single('file');

  return (req, res, next) => {
    singleDocument(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          next(
            new PayloadTooLargeError(
              `Document must be ${(maxBytes / (1024 * 1024)).toFixed(1)} MB or smaller`,
            ),
          );
          return;
        }
        next(new ValidationError(`Invalid document upload: ${error.code}`));
        return;
      }

      next(error);
    });
  };
};
