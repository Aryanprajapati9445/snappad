import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type RequestField = 'body' | 'query' | 'params';

export const validate = (schema: ZodSchema, field: RequestField = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req[field] = schema.parse(req[field]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json({ success: false, message: 'Validation failed', errors });
        return;
      }
      next(error);
    }
  };
};
