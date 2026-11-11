import { Config } from '../src/config/Config';
import { Database } from '../src/config/Database';

describe('configuration and connection singletons', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/studyflows-test';
    process.env.JWT_SECRET = 'unit-test-secret';
  });

  it('returns one Config instance with parsed values', () => {
    const first = Config.getInstance();
    const second = Config.getInstance();

    expect(first).toBe(second);
    expect(first.nodeEnv).toBe('test');
    expect(first.mongodbUri).toBe('mongodb://127.0.0.1:27017/studyflows-test');
    expect(first.jwtSecret).toBe('unit-test-secret');
  });

  it('returns one Database instance', () => {
    expect(Database.getInstance()).toBe(Database.getInstance());
  });
});
