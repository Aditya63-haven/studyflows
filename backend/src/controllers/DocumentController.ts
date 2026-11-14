import { Request, Response } from 'express';
import { NotFoundError, ValidationError } from '../errors';
import { asyncHandler } from '../middleware/asyncHandler';
import { DocumentService } from '../services/DocumentService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

/**
 * HTTP adapter for authenticated document upload, listing and download.
 */
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  public listBySpace = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const documents = await this.documentService.listBySpace(userId, req.params.spaceId);
    res.status(200).json({ documents: documents.map(Serializer.document) });
  });

  public upload = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    if (!req.file) {
      throw new ValidationError('Choose a document to upload');
    }

    const document = await this.documentService.upload(userId, req.params.spaceId, {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer,
    });
    res.status(201).json({ document: Serializer.document(document) });
  });

  public get = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const document = await this.documentService.getOwned(userId, req.params.id);
    res.status(200).json({ document: Serializer.document(document) });
  });

  public download = asyncHandler(async (req: Request, res: Response, next) => {
    const { userId } = authContext(req);
    const { document, stream, size } = await this.documentService.read(
      userId,
      req.params.id,
    );

    if (!(stream instanceof Object) || !('pipe' in stream)) {
      throw new NotFoundError('Document file not found');
    }

    const filename = document.getOriginalName().replace(/["\\]/g, '_');
    res.setHeader('Content-Type', document.getMimeType());
    res.setHeader('Content-Length', String(size));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    stream.on('error', next);
    stream.pipe(res);
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    await this.documentService.delete(userId, req.params.id);
    res.status(204).send();
  });
}
