/**
 * Generic persistence contract.
 *
 * OOP: Repository - services depend on this abstraction rather than Mongoose.
 * OOP: DIP - concrete repositories are injected into services.
 */
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findMany(filter?: Record<string, unknown>): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: string, entity: T): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}
