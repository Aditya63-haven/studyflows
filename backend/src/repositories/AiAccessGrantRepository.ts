import { AiAccessGrant } from '../domain/entities/AiAccessGrant';
import { AiAccessGrantMapper } from '../persistence/mappers/aiAccessGrantMapper';
import {
  AiAccessGrantDocument,
  AiAccessGrantModel,
} from '../persistence/schemas/aiAccessGrant.schema';
import { BaseRepository } from './BaseRepository';

export class AiAccessGrantRepository extends BaseRepository<AiAccessGrant, AiAccessGrantDocument> {
  constructor() {
    super(AiAccessGrantModel);
  }

  public async findByEmail(email: string): Promise<AiAccessGrant | null> {
    const document = await this.model.findOne({ email: email.trim().toLowerCase() }).exec();
    return document
      ? AiAccessGrantMapper.toDomain(document.toObject() as unknown as AiAccessGrantDocument)
      : null;
  }

  public async findAll(): Promise<AiAccessGrant[]> {
    const documents = await this.model.find().sort({ createdAt: -1 }).exec();
    return documents.map((document) =>
      AiAccessGrantMapper.toDomain(document.toObject() as unknown as AiAccessGrantDocument),
    );
  }

  protected override toDomain(document: AiAccessGrantDocument): AiAccessGrant {
    return AiAccessGrantMapper.toDomain(document);
  }

  protected override toPersistence(entity: AiAccessGrant): AiAccessGrantDocument {
    return AiAccessGrantMapper.toPersistence(entity);
  }
}
