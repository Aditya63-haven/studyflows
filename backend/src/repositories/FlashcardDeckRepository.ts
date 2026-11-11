import { FlashcardDeck } from '../domain/entities/FlashcardDeck';
import { FlashcardDeckMapper } from '../persistence/mappers/flashcardDeckMapper';
import {
  FlashcardDeckDocument,
  FlashcardDeckModel,
} from '../persistence/schemas/flashcardDeck.schema';
import { BaseRepository } from './BaseRepository';

export class FlashcardDeckRepository extends BaseRepository<
  FlashcardDeck,
  FlashcardDeckDocument
> {
  constructor() {
    super(FlashcardDeckModel);
  }

  public findByOwner(ownerId: string): Promise<FlashcardDeck[]> {
    return this.findMany({ owner: ownerId });
  }

  public findBySpace(spaceId: string): Promise<FlashcardDeck[]> {
    return this.findMany({ space: spaceId });
  }

  public async deleteBySpace(spaceId: string): Promise<number> {
    const result = await this.model.deleteMany({ space: spaceId }).exec();
    return result.deletedCount ?? 0;
  }

  protected override toDomain(document: FlashcardDeckDocument): FlashcardDeck {
    return FlashcardDeckMapper.toDomain(document);
  }

  protected override toPersistence(entity: FlashcardDeck): FlashcardDeckDocument {
    return FlashcardDeckMapper.toPersistence(entity);
  }
}
