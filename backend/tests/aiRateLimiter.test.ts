import { AiRateLimiter } from '../src/services/AiRateLimiter';

describe('AiRateLimiter', () => {
  it('enforces the per-user sliding window and resets after a minute', () => {
    const limiter = new AiRateLimiter(2, 100, 60_000);

    limiter.consume('user-1', 0);
    limiter.consume('user-1', 10_000);
    expect(() => limiter.consume('user-1', 20_000)).toThrow(
      expect.objectContaining({ statusCode: 429 }),
    );

    expect(() => limiter.consume('user-1', 61_000)).not.toThrow();
  });

  it('enforces the global limit across different users', () => {
    const limiter = new AiRateLimiter(10, 2, 60_000);

    limiter.consume('user-1', 0);
    limiter.consume('user-2', 1_000);
    expect(() => limiter.consume('user-3', 2_000)).toThrow(
      'The AI assistant is busy right now. Please try again shortly.',
    );
  });

  it('reports a retry delay in error details', () => {
    const limiter = new AiRateLimiter(1, 10, 60_000);
    limiter.consume('user-1', 0);

    try {
      limiter.consume('user-1', 15_000);
      throw new Error('Expected rate limit');
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 429,
        details: { retryAfterSeconds: 45 },
      });
    }
  });
});
