import { ValidationError } from '../../errors';
import { requireDate, requireNonEmpty, resolveId } from '../base/helpers';

export interface UserProps {
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Registered student.
 *
 * OOP: Classes and objects - models a user with validated identity fields.
 * OOP: Encapsulation - the password hash is private and has no public getter.
 * OOP: Association - a User can own multiple StudySpaces.
 */
export class User {
  private readonly _id: string;
  private _name: string;
  private _email: string;
  private _passwordHash: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: UserProps) {
    this._id = resolveId(props.id);
    this._name = requireNonEmpty(props.name, 'name');
    this._email = User.normalizeEmail(props.email);
    this._passwordHash = User.validatePasswordHash(props.passwordHash);
    this._createdAt = props.createdAt ? requireDate(props.createdAt, 'createdAt') : new Date();
    this._updatedAt = props.updatedAt ? requireDate(props.updatedAt, 'updatedAt') : new Date();
  }

  public getId(): string {
    return this._id;
  }

  public getName(): string {
    return this._name;
  }

  public setName(name: string): void {
    this._name = requireNonEmpty(name, 'name');
    this.touch();
  }

  public getEmail(): string {
    return this._email;
  }

  public setEmail(email: string): void {
    this._email = User.normalizeEmail(email);
    this.touch();
  }

  public setPasswordHash(passwordHash: string): void {
    this._passwordHash = User.validatePasswordHash(passwordHash);
    this.touch();
  }

  public hasPasswordHash(): boolean {
    return this._passwordHash.length > 0;
  }

  /**
   * Internal bridge for persistence mappers. Never serialize this value into API
   * responses; use `toJSON()` for the safe public representation.
   */
  public getPasswordHashForPersistence(): string {
    return this._passwordHash;
  }

  /**
   * Verifies a candidate password through an injected comparison function.
   * The hash itself is never returned to callers.
   */
  public async verifyPassword(
    candidate: string,
    compare: (candidate: string, hash: string) => Promise<boolean>,
  ): Promise<boolean> {
    if (typeof candidate !== 'string' || candidate.length === 0) {
      return false;
    }
    return compare(candidate, this._passwordHash);
  }

  public getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public getUpdatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  /**
   * Safe API representation that intentionally omits the password hash.
   */
  public toJSON(): {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this._id,
      name: this._name,
      email: this._email,
      createdAt: this.getCreatedAt(),
      updatedAt: this.getUpdatedAt(),
    };
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  private static normalizeEmail(email: string): string {
    const normalized = requireNonEmpty(email, 'email').toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new ValidationError('email must be a valid email address');
    }
    return normalized;
  }

  private static validatePasswordHash(passwordHash: string): string {
    const hash = requireNonEmpty(passwordHash, 'passwordHash');
    if (hash.length < 8) {
      throw new ValidationError('passwordHash is not a valid hash');
    }
    return hash;
  }
}
