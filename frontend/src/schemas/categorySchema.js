import { z } from 'zod';

/**
 * Normalizes a string to Title Case with whitespace trimmed and collapsed.
 * Examples:
 *   "food" -> "Food"
 *   "travel expenses" -> "Travel Expenses"
 *   "  FOOD  " -> "Food"
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name is required')
    .max(50, 'Category name cannot exceed 50 characters')
    .transform(toTitleCase),
});
