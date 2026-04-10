import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void => {
  logger.error(`${err.message}`, {
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      message: err.message,
      error: err.code,
    };

    if (err instanceof ValidationError) {
      (response as any).errors = err.errors;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  
  if ((err as any).code === '23505') {
    res.status(409).json({
      success: false,
      message: 'A record with this information already exists',
      error: 'DUPLICATE_ENTRY',
    });
    return;
  }

  if ((err as any).code === '23503') {
    res.status(400).json({
      success: false,
      message: 'Referenced record not found',
      error: 'FOREIGN_KEY_VIOLATION',
    });
    return;
  }

  
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
    error: 'INTERNAL_SERVER_ERROR',
  });
};


export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};