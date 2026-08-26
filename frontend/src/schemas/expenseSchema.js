import { z } from 'zod';

export const expenseSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(50, 'Title cannot exceed 50 characters')
    .trim(),
  category_id: z
    .string()
    .uuid('Please select a valid category'),
  amount: z
    .coerce
    .number({ invalid_type_error: 'Amount must be a valid number' })
    .positive('Amount must be strictly greater than 0'),
  expense_date: z
    .string()
    .min(1, 'Date is required')
    .refine((val) => {
      const selected = new Date(val);
      const today = new Date();
      // Set hours to 23:59:59 to allow today
      today.setHours(23, 59, 59, 999);
      return selected <= today;
    }, {
      message: 'Expense date cannot be in the future',
    }),
  notes: z
    .string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .nullable(),
  payment_mode: z
    .enum(['cash', 'card', 'upi', ''])
    .optional()
    .nullable(),
});
