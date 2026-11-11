import { SharedLink } from '../../domain/entities/SharedLink';
import { SharedLinkDocument } from '../schemas/sharedLink.schema';

export class SharedLinkMapper {
  public static toDomain(document: SharedLinkDocument): SharedLink {
    return new SharedLink({
      id: document._id,
      token: document.token,
      itemId: document.itemId,
      itemType: document.itemType,
      ownerId: document.owner,
      expiresAt: document.expiresAt,
      revoked: document.revoked,
      createdAt: document.createdAt,
    });
  }

  public static toPersistence(link: SharedLink): SharedLinkDocument {
    return {
      _id: link.getId(),
      token: link.getToken(),
      itemId: link.getItemId(),
      itemType: link.getItemType(),
      owner: link.getOwnerId(),
      expiresAt: link.getExpiresAt(),
      revoked: link.isRevoked(),
      createdAt: link.getCreatedAt(),
      updatedAt: link.getCreatedAt(),
    };
  }
}
