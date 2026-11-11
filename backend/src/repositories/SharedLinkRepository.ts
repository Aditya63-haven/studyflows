import { SharedLink } from '../domain/entities/SharedLink';
import { SharedLinkMapper } from '../persistence/mappers/sharedLinkMapper';
import {
  SharedLinkDocument,
  SharedLinkModel,
} from '../persistence/schemas/sharedLink.schema';
import { BaseRepository } from './BaseRepository';

export class SharedLinkRepository extends BaseRepository<SharedLink, SharedLinkDocument> {
  constructor() {
    super(SharedLinkModel);
  }

  public async findByToken(token: string): Promise<SharedLink | null> {
    const document = await this.model.findOne({ token }).exec();
    return document
      ? SharedLinkMapper.toDomain(document.toObject() as unknown as SharedLinkDocument)
      : null;
  }

  public findActiveByItem(itemId: string, itemType: 'note' | 'quiz'): Promise<SharedLink[]> {
    return this.findMany({ itemId, itemType, revoked: false });
  }

  protected override toDomain(document: SharedLinkDocument): SharedLink {
    return SharedLinkMapper.toDomain(document);
  }

  protected override toPersistence(entity: SharedLink): SharedLinkDocument {
    return SharedLinkMapper.toPersistence(entity);
  }
}
