import { StudySpace } from '../../domain/entities/StudySpace';
import { StudySpaceDocument } from '../schemas/studySpace.schema';

export class StudySpaceMapper {
  public static toDomain(document: StudySpaceDocument): StudySpace {
    return new StudySpace({
      id: document._id,
      ownerId: document.owner,
      name: document.name,
      subject: document.subject,
      description: document.description,
      color: document.color,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  public static toPersistence(space: StudySpace): StudySpaceDocument {
    return {
      _id: space.getId(),
      owner: space.getOwnerId(),
      name: space.getName(),
      subject: space.getSubject(),
      description: space.getDescription(),
      color: space.getColor(),
      createdAt: space.getCreatedAt(),
      updatedAt: space.getUpdatedAt(),
    };
  }
}
