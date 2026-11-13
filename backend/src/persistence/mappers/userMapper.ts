import { User } from '../../domain/entities/User';
import { UserDocument } from '../schemas/user.schema';

/**
 * OOP: Adapter boundary - converts persistence records into domain objects and back.
 */
export class UserMapper {
  public static toDomain(document: UserDocument): User {
    return new User({
      id: document._id,
      name: document.name,
      email: document.email,
      passwordHash: document.passwordHash,
      avatarKey: document.avatarKey ?? null,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  public static toPersistence(user: User): UserDocument {
    return {
      _id: user.getId(),
      name: user.getName(),
      email: user.getEmail(),
      passwordHash: user.getPasswordHashForPersistence(),
      avatarKey: user.getAvatarKey(),
      createdAt: user.getCreatedAt(),
      updatedAt: user.getUpdatedAt(),
    };
  }
}
