import { Readable } from 'stream';

/**
 * OOP: Abstraction - profile-photo persistence can move from local disk to
 * object storage without changing the profile use cases.
 */
export interface AvatarReadResult {
  stream: Readable;
  size: number;
}

export interface IAvatarStorage {
  save(buffer: Buffer): Promise<string>;
  get(key: string): Promise<AvatarReadResult | null>;
  delete(key: string): Promise<void>;
}
