import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const formattedErrors = result.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      next(new ValidationError('Validation failed', formattedErrors));
    } else {
      // Only assign to req.body (writable). req.query and req.params are read-only getters.
      if (source === 'body') {
        req.body = result.data;
      }
      // For query/params, validation is sufficient - Express already parsed them correctly
      next();
    }
  };
};