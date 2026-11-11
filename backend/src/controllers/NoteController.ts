import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  CreateNoteInput,
  NoteService,
  UpdateNoteInput,
} from '../services/NoteService';
import { authContext } from '../utils/authContext';
import { Serializer } from '../utils/serializers';

/**
 * HTTP adapter for note use cases.
 */
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  public listBySpace = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const notes = await this.noteService.listBySpace(userId, req.params.spaceId);
    res.status(200).json({ notes: notes.map(Serializer.note) });
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const note = await this.noteService.create(
      userId,
      req.params.spaceId,
      req.body as CreateNoteInput,
    );
    res.status(201).json({ note: Serializer.note(note) });
  });

  public get = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const note = await this.noteService.getOwned(userId, req.params.id);
    res.status(200).json({ note: Serializer.note(note) });
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const note = await this.noteService.update(
      userId,
      req.params.id,
      req.body as UpdateNoteInput,
    );
    res.status(200).json({ note: Serializer.note(note) });
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    await this.noteService.delete(userId, req.params.id);
    res.status(204).send();
  });

  public condense = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = authContext(req);
    const note = await this.noteService.condense(userId, req.params.id);
    res.status(200).json({ note: Serializer.note(note) });
  });
}
