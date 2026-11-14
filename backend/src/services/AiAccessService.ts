import { Config } from '../config/Config';
import { AiAccessGrant } from '../domain/entities/AiAccessGrant';
import { User } from '../domain/entities/User';
import { ConflictError, ForbiddenError, NotFoundError } from '../errors';
import { AiAccessGrantRepository } from '../repositories/AiAccessGrantRepository';
import { UserRepository } from '../repositories/UserRepository';

export type AiAccessUserStatus = 'admin' | 'active' | 'revoked' | 'none';
export type AiAccessGrantStatus = 'pending' | 'registered' | 'revoked';

export interface AiAccessStatusView {
  allowed: boolean;
  isAdmin: boolean;
  email: string;
  status: AiAccessUserStatus;
}

export interface AiAccessGrantView {
  id: string;
  email: string;
  status: AiAccessGrantStatus;
  invitedBy: string;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invite-only access policy for every AI-backed feature.
 *
 * OOP: SRP - owns grant lifecycle and permission decisions.
 * OOP: DIP - depends on injected repositories and configuration.
 * OOP: Encapsulation - admin identity comes from configuration rather than
 * client-supplied roles.
 */
export class AiAccessService {
  constructor(
    private readonly grantRepository: AiAccessGrantRepository,
    private readonly userRepository: UserRepository,
    private readonly config: Config,
  ) {}

  public async getStatus(userId: string): Promise<AiAccessStatusView> {
    const user = await this.requireUser(userId);
    return this.buildStatus(user);
  }

  public async assertAccess(userId: string): Promise<AiAccessStatusView> {
    const status = await this.getStatus(userId);
    if (!status.allowed) {
      throw new ForbiddenError(
        'AI assistant access is invite-only. Ask the administrator to grant access to your email.',
      );
    }
    return status;
  }

  public async assertAdmin(userId: string): Promise<AiAccessStatusView> {
    const status = await this.getStatus(userId);
    if (!status.isAdmin) {
      throw new ForbiddenError('Only the configured AI access administrator can manage invites');
    }
    return status;
  }

  public async listGrants(requesterId: string): Promise<AiAccessGrantView[]> {
    await this.assertAdmin(requesterId);
    const grants = await this.grantRepository.findAll();
    return Promise.all(grants.map((grant) => this.toView(grant)));
  }

  public async grantAccess(
    requesterId: string,
    email: string,
    now: Date = new Date(),
  ): Promise<AiAccessGrantView> {
    const admin = await this.assertAdmin(requesterId);
    const normalized = email.trim().toLowerCase();

    if (normalized === admin.email) {
      throw new ConflictError('The administrator already has AI assistant access');
    }

    const existing = await this.grantRepository.findByEmail(normalized);
    if (existing?.isActive()) {
      throw new ConflictError('This email already has AI assistant access');
    }

    if (existing) {
      existing.reactivate(admin.email, now);
      const updated = await this.grantRepository.update(existing.getId(), existing);
      if (!updated) {
        throw new NotFoundError('AI access grant not found');
      }
      return this.toView(updated);
    }

    const grant = new AiAccessGrant({
      email: normalized,
      invitedBy: admin.email,
      createdAt: now,
      updatedAt: now,
    });

    try {
      const created = await this.grantRepository.create(grant);
      return this.toView(created);
    } catch (error) {
      if (AiAccessService.isDuplicateKey(error)) {
        throw new ConflictError('This email already has AI assistant access');
      }
      throw error;
    }
  }

  public async revokeAccess(
    requesterId: string,
    grantId: string,
    now: Date = new Date(),
  ): Promise<AiAccessGrantView> {
    await this.assertAdmin(requesterId);
    const grant = await this.grantRepository.findById(grantId);
    if (!grant) {
      throw new NotFoundError('AI access grant not found');
    }
    if (grant.isActive()) {
      grant.revoke(now);
      const updated = await this.grantRepository.update(grant.getId(), grant);
      if (!updated) {
        throw new NotFoundError('AI access grant not found');
      }
      return this.toView(updated);
    }
    return this.toView(grant);
  }

  private async buildStatus(user: User): Promise<AiAccessStatusView> {
    if (this.isConfiguredAdmin(user.getEmail())) {
      return {
        allowed: true,
        isAdmin: true,
        email: user.getEmail(),
        status: 'admin',
      };
    }

    const grant = await this.grantRepository.findByEmail(user.getEmail());
    if (!grant) {
      return {
        allowed: false,
        isAdmin: false,
        email: user.getEmail(),
        status: 'none',
      };
    }
    if (!grant.isActive()) {
      return {
        allowed: false,
        isAdmin: false,
        email: user.getEmail(),
        status: 'revoked',
      };
    }
    return {
      allowed: true,
      isAdmin: false,
      email: user.getEmail(),
      status: 'active',
    };
  }

  private async toView(grant: AiAccessGrant): Promise<AiAccessGrantView> {
    const registeredUser = await this.userRepository.findByEmail(grant.getEmail());
    const status: AiAccessGrantStatus = !grant.isActive()
      ? 'revoked'
      : registeredUser
        ? 'registered'
        : 'pending';

    return {
      id: grant.getId(),
      email: grant.getEmail(),
      status,
      invitedBy: grant.getInvitedBy(),
      revokedAt: grant.getRevokedAt(),
      createdAt: grant.getCreatedAt(),
      updatedAt: grant.getUpdatedAt(),
    };
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  private isConfiguredAdmin(email: string): boolean {
    return this.config.aiAccessAdminEmail === email.trim().toLowerCase();
  }

  private static isDuplicateKey(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 11000
    );
  }
}
