import {
  AppError,
  AuthError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../src/errors';

describe('error hierarchy', () => {
  const cases: Array<{ error: AppError; statusCode: number; name: string }> = [
    { error: new ValidationError('Invalid input'), statusCode: 400, name: 'ValidationError' },
    { error: new AuthError('Not authenticated'), statusCode: 401, name: 'AuthError' },
    { error: new ForbiddenError('Forbidden'), statusCode: 403, name: 'ForbiddenError' },
    { error: new NotFoundError('Missing'), statusCode: 404, name: 'NotFoundError' },
    { error: new ConflictError('Duplicate'), statusCode: 409, name: 'ConflictError' },
  ];

  it.each(cases)('creates a $name with status $statusCode', ({ error, statusCode, name }) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(statusCode);
    expect(error.name).toBe(name);
    expect(error.isOperational).toBe(true);
  });

  it('defaults the base error to a 500 response', () => {
    const error = new AppError('Unexpected');

    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('AppError');
    expect(error.toJSON()).toEqual({
      name: 'AppError',
      message: 'Unexpected',
      statusCode: 500,
    });
  });

  it('serializes details without stack traces', () => {
    const error = new ValidationError('Invalid input', { field: 'email' });

    expect(error.toJSON()).toEqual({
      name: 'ValidationError',
      message: 'Invalid input',
      statusCode: 400,
      details: { field: 'email' },
    });
    expect(error.toJSON()).not.toHaveProperty('stack');
  });
});
