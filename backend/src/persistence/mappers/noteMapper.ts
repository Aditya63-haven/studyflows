import { Note } from '../../domain/entities/Note';
import { NoteDocument } from '../schemas/note.schema';

export class NoteMapper {
  public static toDomain(document: NoteDocument): Note {
    return new Note({
      id: document._id,
      ownerId: document.owner,
      spaceId: document.space,
      title: document.title,
      content: document.content,
      aiSummary: document.aiSummary,
      tags: document.tags,
      shareToken: document.shareToken,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  public static toPersistence(note: Note): NoteDocument {
    return {
      _id: note.getId(),
      owner: note.getOwnerId(),
      space: note.getSpaceId(),
      title: note.getTitle(),
      content: note.getContent(),
      aiSummary: note.getAiSummary(),
      tags: note.getTags(),
      shareToken: note.getShareToken(),
      createdAt: note.getCreatedAt(),
      updatedAt: note.getUpdatedAt(),
    };
  }
}
