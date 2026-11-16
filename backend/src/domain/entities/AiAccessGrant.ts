import { ValidationError } from '../../errors';
import { requireDate, requireNonEmpty, resolveId } from '../base/helpers';

export type AiAccessGrantState = 'active' | 'revoked';

export interface AiAccessGrantProps {
  id?: string;
  email: string;
  invitedBy: string;
  revokedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Administrator-issued invitation for AI assistant access.
 *
 * OOP: Classes and objects - models an invite keyed by normalized email.
 * OOP: Encapsulation - email and revocation state are private and validated.
 */
export class AiAccessGrant {
  private readonly _id: string;
  private readonly _email: string;
  private _invitedBy: string;
  private _revokedAt: Date | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: AiAccessGrantProps) {
    this._id = resolveId(props.id);
    this._email = AiAccessGrant.normalizeEmail(props.email);
    this._invitedBy = requireNonEmpty(props.invitedBy, 'invitedBy');
    this._revokedAt = props.revokedAt ? requireDate(props.revokedAt, 'revokedAt') : null;
    this._createdAt = props.createdAt ? requireDate(props.createdAt, 'createdAt') : new Date();
    this._updatedAt = props.updatedAt
      ? requireDate(props.updatedAt, 'updatedAt')
      : new Date(this._createdAt);
  }

  public getId(): string {
    return this._id;
  }

  public getEmail(): string {
    return this._email;
  }

  public getInvitedBy(): string {
    return this._invitedBy;
  }

  public getRevokedAt(): Date | null {
    return this._revokedAt ? new Date(this._revokedAt.getTime()) : null;
  }

  public getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public getUpdatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  public getState(): AiAccessGrantState {
    return this._revokedAt ? 'revoked' : 'active';
  }

  public isActive(): boolean {
    return this._revokedAt === null;
  }

  public revoke(at: Date = new Date()): void {
    this._revokedAt = requireDate(at, 'revokedAt');
    this._updatedAt = new Date(at.getTime());
  }

  public reactivate(invitedBy: string, at: Date = new Date()): void {
    this._invitedBy = requireNonEmpty(invitedBy, 'invitedBy');
    this._revokedAt = null;
    this._updatedAt = new Date(at.getTime());
  }

  private static normalizeEmail(email: string): string {
    const normalized = requireNonEmpty(email, 'email').toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new ValidationError('email must be a valid email address');
    }
    return normalized;
  }
}
