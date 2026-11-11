import { StudentAvailability } from '../domain/entities/StudentAvailability';
import { AvailabilityMapper } from '../persistence/mappers/availabilityMapper';
import {
  AvailabilityDocument,
  AvailabilityModel,
} from '../persistence/schemas/availability.schema';
import { BaseRepository } from './BaseRepository';

export class AvailabilityRepository extends BaseRepository<
  StudentAvailability,
  AvailabilityDocument
> {
  constructor() {
    super(AvailabilityModel);
  }

  public async findByOwner(ownerId: string): Promise<StudentAvailability | null> {
    const documents = await this.model.find({ owner: ownerId }).limit(1).exec();
    const document = documents[0];
    return document
      ? this.toDomain(document.toObject() as unknown as AvailabilityDocument)
      : null;
  }

  protected override toDomain(document: AvailabilityDocument): StudentAvailability {
    return AvailabilityMapper.toDomain(document);
  }

  protected override toPersistence(entity: StudentAvailability): AvailabilityDocument {
    return AvailabilityMapper.toPersistence(entity);
  }
}
