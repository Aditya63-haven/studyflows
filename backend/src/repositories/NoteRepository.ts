import { Note } from '../domain/entities/Note';
import { NoteMapper } from '../persistence/mappers/noteMapper';
import { NoteDocument, NoteModel } from '../persistence/schemas/note.schema';
import { BaseRepository } from './BaseRepository';

export class NoteRepository extends BaseRepository<Note, NoteDocument> {
  constructor() {
    super(NoteModel);
  }

  public findByOwner(ownerId: string): Promise<Note[]> {
    return this.findMany({ owner: ownerId });
  }

  public findBySpace(spaceId: string): Promise<Note[]> {
    return this.findMany({ space: spaceId });
  }

  public async deleteBySpace(spaceId: string): Promise<number> {
    const result = await this.model.deleteMany({ space: spaceId }).exec();
    return result.deletedCount ?? 0;
  }

  protected override toDomain(document: NoteDocument): Note {
    return NoteMapper.toDomain(document);
  }

  protected override toPersistence(entity: Note): NoteDocument {
    return NoteMapper.toPersistence(entity);
  }
}
