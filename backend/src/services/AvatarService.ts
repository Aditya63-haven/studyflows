import { AVATAR_MAX_BYTES } from '../config/avatar';
import { User } from '../domain/entities/User';
import { AvatarReadResult, IAvatarStorage } from '../domain/interfaces/IAvatarStorage';
import { NotFoundError, PayloadTooLargeError, ValidationError } from '../errors';
import { UserRepository } from '../repositories/UserRepository';
import { ImageProcessor } from './ImageProcessor';

/**
 * Owns profile-picture processing, persistence and cleanup.
 *
 * OOP: DIP - depends on the avatar storage abstraction and repository, not on
 * local filesystem or Mongoose details.
 */
export class AvatarService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly storage: IAvatarStorage,
    private readonly imageProcessor: ImageProcessor,
  ) {}

  public async readAvatar(key: string): Promise<AvatarReadResult | null> {
    return this.storage.get(key);
  }

  public async uploadAvatar(userId: string, file: Buffer): Promise<User> {
    if (!Buffer.isBuffer(file) || file.length === 0) {
      throw new ValidationError('Profile picture is required');
    }
    if (file.length > AVATAR_MAX_BYTES) {
      throw new PayloadTooLargeError('Profile picture must be 5 MB or smaller');
    }

    const user = await this.getUser(userId);
    const previousKey = user.getAvatarKey();
    const processed = await this.imageProcessor.process(file);
    const nextKey = await this.storage.save(processed);
    user.setAvatarKey(nextKey);

    let updated: User | null;
    try {
      updated = await this.userRepository.update(userId, user);
    } catch (error) {
      await this.safeDelete(nextKey);
      throw error;
    }

    if (!updated) {
      await this.safeDelete(nextKey);
      throw new NotFoundError('User not found');
    }

    if (previousKey && previousKey !== nextKey) {
      await this.safeDelete(previousKey);
    }

    return updated;
  }

  public async removeAvatar(userId: string): Promise<User> {
    const user = await this.getUser(userId);
    const previousKey = user.getAvatarKey();
    if (!previousKey) {
      return user;
    }

    user.clearAvatarKey();
    const updated = await this.userRepository.update(userId, user);
    if (!updated) {
      throw new NotFoundError('User not found');
    }

    await this.safeDelete(previousKey);
    return updated;
  }

  private async getUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  private async safeDelete(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      console.warn(`[avatar] Failed to delete stored avatar ${key}`, error);
    }
  }
}
