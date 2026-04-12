import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const createContentSchema = z.object({
  type: z.enum(['text', 'link', 'image', 'file']),
  title: z.string().max(200).optional(),
  content: z.string().max(50000).optional(),
  fileUrl: z.string().url().optional(),
  tags: z.array(z.string().max(30)).max(20).optional().default([]),
  metadata: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      image: z.string().optional(),
      domain: z.string().optional(),
      favicon: z.string().optional(),
    })
    .optional(),
});

export const updateContentSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().max(50000).optional(),
  tags: z.array(z.string().max(30)).max(20).optional(),
  isPinned: z.boolean().optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().optional(),
  type: z.enum(['text', 'link', 'image', 'file']).optional(),
  tags: z.string().optional(), // comma-separated
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => Math.min(parseInt(val || '20'), 50)),
  sort: z.enum(['newest', 'oldest', 'pinned']).optional().default('newest'),
});
