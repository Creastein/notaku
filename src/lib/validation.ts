import { z } from 'zod';

// Example schema for a scan request (you can extend as needed)
export const scanRequestSchema = z.object({
  imageUrl: z.string().url(),
  // add additional fields if required
});

// Example schema for an advisor request
export const advisorRequestSchema = z.object({
  userId: z.string().uuid(),
  query: z.string().min(1),
});

// Export a helper to parse and validate
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error('Validation failed: ' + result.error.message);
  }
  return result.data;
}
