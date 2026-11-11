import { RequestHandler } from 'express';
import { ZodTypeAny } from 'zod';
import { ValidationError } from '../errors';

export interface RequestSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

type RequestSource = 'body' | 'params' | 'query';

/**
 * Validates request input with Zod and replaces it with the parsed value.
 *
 * OOP: SRP - validation is a middleware concern, not a controller concern.
 */
export const validate = (schemas: RequestSchemas): RequestHandler => {
  return (req, _res, next) => {
    const sources: RequestSource[] = ['params', 'query', 'body'];

    for (const source of sources) {
      const schema = schemas[source];
      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[source]);
      if (!result.success) {
        next(
          new ValidationError(`Invalid request ${source}`, result.error.flatten()),
        );
        return;
      }

      (req as unknown as Record<string, unknown>)[source] = result.data;
    }

    next();
  };
};
