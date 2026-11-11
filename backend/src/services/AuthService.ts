import bcrypt from 'bcryptjs';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { Config } from '../config/Config';
import { AuthError, ConflictError, NotFoundError, ValidationError } from '../errors';
import { User } from '../domain/entities/User';
import { UserRepository } from '../repositories/UserRepository';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: ReturnType<User['toJSON']>;
}

/**
 * Authentication use cases.
 *
 * OOP: SRP - handles registration, login and token verification only.
 * OOP: DIP - depends on UserRepository and Config, both injected.
 */
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly config: Config,
  ) {}

  public async register(input: RegisterInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    if (input.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = new User({
      name: input.name,
      email,
      passwordHash,
    });
    const created = await this.userRepository.create(user);
    return this.issueToken(created);
  }

  public async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new AuthError('Invalid email or password');
    }

    const valid = await user.verifyPassword(input.password, (candidate, hash) =>
      bcrypt.compare(candidate, hash),
    );
    if (!valid) {
      throw new AuthError('Invalid email or password');
    }

    return this.issueToken(user);
  }

  public async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  public verifyToken(token: string): AuthTokenPayload {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret) as JwtPayload;
      const userId = typeof payload.sub === 'string' ? payload.sub : '';
      const email = typeof payload.email === 'string' ? payload.email : '';
      if (!userId || !email) {
        throw new AuthError('Invalid token payload');
      }
      return { userId, email };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Invalid or expired token');
    }
  }

  private issueToken(user: User): AuthResult {
    const token = jwt.sign(
      { sub: user.getId(), email: user.getEmail() },
      this.config.jwtSecret,
      { expiresIn: this.config.jwtExpiresIn as SignOptions['expiresIn'] },
    );
    return { token, user: user.toJSON() };
  }
}
