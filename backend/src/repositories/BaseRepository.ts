import { FilterQuery, Model, UpdateQuery } from 'mongoose';
import { IRepository } from '../domain/interfaces/IRepository';

/**
 * Generic Mongoose-backed repository.
 *
 * OOP: Repository - provides collection-independent CRUD behavior.
 * OOP: DIP - services depend on IRepository<T>, not on Mongoose models.
 * OOP: Template Method - concrete repositories supply mapping behavior.
 */
export abstract class BaseRepository<T, TDocument extends object> implements IRepository<T> {
  protected constructor(protected readonly model: Model<TDocument>) {}

  protected abstract toDomain(document: TDocument): T;

  protected abstract toPersistence(entity: T): TDocument;

  public async findById(id: string): Promise<T | null> {
    const document = await this.model.findById(id).exec();
    return document ? this.toDomain(document.toObject() as unknown as TDocument) : null;
  }

  public async findMany(filter: Record<string, unknown> = {}): Promise<T[]> {
    const documents = await this.model
      .find(filter as FilterQuery<TDocument>)
      .exec();
    return documents.map((document) =>
      this.toDomain(document.toObject() as unknown as TDocument),
    );
  }

  public async create(entity: T): Promise<T> {
    const document = await this.model.create(this.toPersistence(entity));
    return this.toDomain(document.toObject() as unknown as TDocument);
  }

  public async update(id: string, entity: T): Promise<T | null> {
    const document = await this.model
      .findByIdAndUpdate(id, this.toPersistence(entity) as unknown as UpdateQuery<TDocument>, {
        new: true,
        runValidators: true,
      })
      .exec();
    return document ? this.toDomain(document.toObject() as unknown as TDocument) : null;
  }

  public async delete(id: string): Promise<boolean> {
    const document = await this.model.findByIdAndDelete(id).exec();
    return document !== null;
  }

  public async exists(id: string): Promise<boolean> {
    const document = await this.model.exists({ _id: id } as FilterQuery<TDocument>);
    return document !== null;
  }
}
