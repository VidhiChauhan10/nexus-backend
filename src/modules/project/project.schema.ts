import { z } from 'zod';

export const createProjectSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
});

export const updateProjectSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
});

export const addMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']).default('member'),
});
