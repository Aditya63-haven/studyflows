import { User } from '../domain/entities/User';
import { UserMapper } from '../persistence/mappers/userMapper';
import { UserDocument, UserModel } from '../persistence/schemas/user.schema';
import { BaseRepository } from './BaseRepository';

export class UserRepository extends BaseRepository<User, UserDocument> {
  constructor() {
    super(UserModel);
  }

  public async findByEmail(email: string): Promise<User | null> {
    const document = await this.model.findOne({ email: email.trim().toLowerCase() }).exec();
    return document
      ? UserMapper.toDomain(document.toObject() as unknown as UserDocument)
      : null;
  }

  protected override toDomain(document: UserDocument): User {
    return UserMapper.toDomain(document);
  }

  protected override toPersistence(entity: User): UserDocument {
    return UserMapper.toPersistence(entity);
  }
}
