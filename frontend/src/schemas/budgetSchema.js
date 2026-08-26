import { z } from 'zod';

export const budgetSchema = z.object({
  category_id: z
    .string()
    .uuid()
    .optional()
    .nullable(),
  period_month: z
    .string()
    .min(1, 'Period month is required'),
  limit_amount: z
    .coerce
    .number({ invalid_type_error: 'Limit must be a valid number' })
    .positive('Budget limit must be strictly greater than 0'),
});
