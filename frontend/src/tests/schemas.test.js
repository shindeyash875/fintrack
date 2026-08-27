import { describe, it, expect } from 'vitest';
import { expenseSchema } from '../schemas/expenseSchema';
import { categorySchema } from '../schemas/categorySchema';
import { budgetSchema } from '../schemas/budgetSchema';

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
    expect(result.data.name).toBe('Subscriptions');
  });

  it('fails on empty or overly long name', () => {
    expect(categorySchema.safeParse({ name: '' }).success).toBe(false);
    expect(categorySchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(categorySchema.safeParse({ name: 'A'.repeat(51) }).success).toBe(false);
  });

  it('normalizes category names to Title Case and trims spaces', () => {
    const res1 = categorySchema.safeParse({ name: 'food' });
    expect(res1.success).toBe(true);
    expect(res1.data.name).toBe('Food');

    const res2 = categorySchema.safeParse({ name: '  travel expenses  ' });
    expect(res2.success).toBe(true);
    expect(res2.data.name).toBe('Travel Expenses');

    const res3 = categorySchema.safeParse({ name: 'FOOD' });
    expect(res3.success).toBe(true);
    expect(res3.data.name).toBe('Food');
  });
});

describe('budgetSchema validation', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  it('validates a valid overall monthly budget payload', () => {
    const overallBudget = {
      category_id: null,
      period_month: '2026-08-01',
      limit_amount: 25000,
    };
    const res = budgetSchema.safeParse(overallBudget);
    expect(res.success).toBe(true);
    expect(res.data.category_id).toBe(null);
    expect(res.data.limit_amount).toBe(25000);
  });

  it('converts empty string category_id to null for overall budget', () => {
    const overallBudget = {
      category_id: '',
      period_month: '2026-08-01',
      limit_amount: 15000,
    };
    const res = budgetSchema.safeParse(overallBudget);
    expect(res.success).toBe(true);
    expect(res.data.category_id).toBe(null);
  });

  it('validates a valid category-specific budget payload', () => {
    const catBudget = {
      category_id: validUUID,
      period_month: '2026-08-01',
      limit_amount: 4500.5,
    };
    const res = budgetSchema.safeParse(catBudget);
    expect(res.success).toBe(true);
    expect(res.data.category_id).toBe(validUUID);
    expect(res.data.limit_amount).toBe(4500.5);
  });

  it('fails when limit_amount is 0 or negative', () => {
    expect(
      budgetSchema.safeParse({
        category_id: null,
        period_month: '2026-08-01',
        limit_amount: 0,
      }).success
    ).toBe(false);

    expect(
      budgetSchema.safeParse({
        category_id: null,
        period_month: '2026-08-01',
        limit_amount: -500,
      }).success
    ).toBe(false);
  });

  it('fails when category_id is an invalid UUID string', () => {
    expect(
      budgetSchema.safeParse({
        category_id: 'not-a-uuid',
        period_month: '2026-08-01',
        limit_amount: 1000,
      }).success
    ).toBe(false);
  });

  it('fails when period_month is missing or empty', () => {
    expect(
      budgetSchema.safeParse({
        category_id: null,
        period_month: '',
        limit_amount: 1000,
      }).success
    ).toBe(false);
  });
});

