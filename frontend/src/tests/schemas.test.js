import { describe, it, expect } from 'vitest';
import { expenseSchema } from '../schemas/expenseSchema';
import { categorySchema } from '../schemas/categorySchema';

describe('expenseSchema validation', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const todayStr = new Date().toISOString().split('T')[0];

  it('validates a valid expense payload', () => {
    const validData = {
      title: 'Groceries',
      category_id: validUUID,
      amount: 150.5,
      expense_date: todayStr,
      notes: 'Weekly market run',
      payment_mode: 'upi',
    };

    const result = expenseSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('fails when title is empty or exceeds 50 characters', () => {
    const emptyTitle = {
      title: '',
      category_id: validUUID,
      amount: 100,
      expense_date: todayStr,
    };
    expect(expenseSchema.safeParse(emptyTitle).success).toBe(false);

    const longTitle = {
      title: 'A'.repeat(51),
      category_id: validUUID,
      amount: 100,
      expense_date: todayStr,
    };
    expect(expenseSchema.safeParse(longTitle).success).toBe(false);
  });

  it('fails when amount is 0 or negative', () => {
    const zeroAmount = {
      title: 'Coffee',
      category_id: validUUID,
      amount: 0,
      expense_date: todayStr,
    };
    expect(expenseSchema.safeParse(zeroAmount).success).toBe(false);

    const negativeAmount = {
      title: 'Coffee',
      category_id: validUUID,
      amount: -25,
      expense_date: todayStr,
    };
    expect(expenseSchema.safeParse(negativeAmount).success).toBe(false);
  });

  it('fails when date is in the future', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const futureStr = futureDate.toISOString().split('T')[0];

    const futureExpense = {
      title: 'Concert',
      category_id: validUUID,
      amount: 500,
      expense_date: futureStr,
    };
    const result = expenseSchema.safeParse(futureExpense);
    expect(result.success).toBe(false);
  });

  it('accepts valid payment modes or null/empty', () => {
    ['cash', 'card', 'upi', '', null].forEach((mode) => {
      const data = {
        title: 'Snacks',
        category_id: validUUID,
        amount: 50,
        expense_date: todayStr,
        payment_mode: mode,
      };
      expect(expenseSchema.safeParse(data).success).toBe(true);
    });
  });
});

describe('categorySchema validation', () => {
  it('validates a valid category name', () => {
    const result = categorySchema.safeParse({ name: 'Subscriptions' });
    expect(result.success).toBe(true);
  });

  it('fails on empty or overly long name', () => {
    expect(categorySchema.safeParse({ name: '' }).success).toBe(false);
    expect(categorySchema.safeParse({ name: 'A'.repeat(51) }).success).toBe(false);
  });
});
