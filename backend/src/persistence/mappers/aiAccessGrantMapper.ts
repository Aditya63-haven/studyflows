import { AiAccessGrant } from '../../domain/entities/AiAccessGrant';
import { AiAccessGrantDocument } from '../schemas/aiAccessGrant.schema';

export class AiAccessGrantMapper {
  public static toDomain(document: AiAccessGrantDocument): AiAccessGrant {
    return new AiAccessGrant({
      id: document._id,
      email: document.email,
      invitedBy: document.invitedBy,
      revokedAt: document.revokedAt ?? null,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  public static toPersistence(grant: AiAccessGrant): AiAccessGrantDocument {
    return {
      _id: grant.getId(),
      email: grant.getEmail(),
      invitedBy: grant.getInvitedBy(),
      revokedAt: grant.getRevokedAt(),
      createdAt: grant.getCreatedAt(),
      updatedAt: grant.getUpdatedAt(),
    };
  }
}
