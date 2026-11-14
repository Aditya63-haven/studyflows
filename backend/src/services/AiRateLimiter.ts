import { AppError } from '../errors';

/**
 * In-memory sliding-window limiter for AI calls.
 *
 * OOP: SRP - enforces per-user and process-wide AI request budgets.
 */
export class AiRateLimiter {
  private readonly userWindows = new Map<string, number[]>();
  private globalWindow: number[] = [];

  constructor(
    private readonly perUserLimit: number,
    private readonly globalLimit: number,
    private readonly windowMs = 60_000,
  ) {}

  public consume(userId: string, now: number = Date.now()): void {
    this.prune(now);

    const userWindow = this.userWindows.get(userId) ?? [];
    if (userWindow.length >= this.perUserLimit) {
      throw this.limitError(userWindow[0], now, 'You are sending AI requests too quickly.');
    }
    if (this.globalWindow.length >= this.globalLimit) {
      throw this.limitError(
        this.globalWindow[0],
        now,
        'The AI assistant is busy right now. Please try again shortly.',
      );
    }

    userWindow.push(now);
    this.userWindows.set(userId, userWindow);
    this.globalWindow.push(now);
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    for (const [userId, window] of this.userWindows) {
      const kept = window.filter((timestamp) => timestamp > cutoff);
      if (kept.length === 0) {
        this.userWindows.delete(userId);
      } else {
        this.userWindows.set(userId, kept);
      }
    }
    this.globalWindow = this.globalWindow.filter((timestamp) => timestamp > cutoff);
  }

  private limitError(oldest: number | undefined, now: number, message: string): AppError {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(((oldest ?? now) + this.windowMs - now) / 1000),
    );
    return new AppError(message, 429, true, { retryAfterSeconds });
  }
}
