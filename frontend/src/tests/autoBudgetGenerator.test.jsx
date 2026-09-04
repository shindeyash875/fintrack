import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoBudgetGeneratorModal } from '../components/ai/AutoBudgetGeneratorModal';
import { aiApi } from '../api/endpoints/ai';

vi.mock('../api/endpoints/ai', () => ({
  aiApi: {
    generateSmartBudget: vi.fn(),
    applySmartBudget: vi.fn(),
  },
}));

describe('AutoBudgetGeneratorModal Component', () => {
  const mockPlan = {
    monthly_income_basis: 60000.0,
    needs_allocation: 30000.0,
    wants_allocation: 18000.0,
    savings_allocation: 12000.0,
    overall_recommended_limit: 48000.0,
    categories: [
      {
        category_id: 'cat-1-uuid',
        category_name: 'Groceries',
        bucket_type: 'needs',
        recommended_limit: 12000.0,
        historical_average: 10000.0,
        rationale: 'Essential food & supplies',
      },
      {
        category_id: 'cat-2-uuid',
        category_name: 'Dining Out',
        bucket_type: 'wants',
        recommended_limit: 5000.0,
        historical_average: 4500.0,
        rationale: 'Discretionary restaurants & cafes',
      },
    ],
    ai_financial_philosophy: 'Allocating 20% into savings compounds your wealth while leaving comfortable room for lifestyle.',
    actionable_milestones: [
      'Automate ₹12,000 SIP transfer on the 1st of every month',
      'Check category alerts weekly',
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<AutoBudgetGeneratorModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/AI 50\/30\/20 Smart Budget/i)).not.toBeInTheDocument();
  });

  it('renders input configuration form and submits parameters', async () => {
    aiApi.generateSmartBudget.mockResolvedValueOnce({
      data: mockPlan,
    });

    render(<AutoBudgetGeneratorModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /AI 50\/30\/20 Smart Budget/i })).toBeInTheDocument();
    expect(screen.getByText(/Monthly Take-Home Income/i)).toBeInTheDocument();

    // Click quick chip 75k
    const chip75k = screen.getByRole('button', { name: '₹75k' });
    fireEvent.click(chip75k);

    const submitBtn = screen.getByRole('button', { name: /Generate AI 50\/30\/20 Smart Budget/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(aiApi.generateSmartBudget).toHaveBeenCalledWith(
        expect.objectContaining({
          monthly_income: 75000,
          savings_target_percentage: 20,
          lifestyle_mode: 'balanced',
        })
      );
    });

    // Check review plan state
    await waitFor(() => {
      expect(screen.getByText(/Needs: ₹30,000/i)).toBeInTheDocument();
      expect(screen.getByText(/Wants: ₹18,000/i)).toBeInTheDocument();
      expect(screen.getByText(/Savings: ₹12,000/i)).toBeInTheDocument();
      expect(screen.getByText(/Allocating 20% into savings/i)).toBeInTheDocument();
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Dining Out')).toBeInTheDocument();
    });
  });

  it('allows applying the generated budget to database', async () => {
    aiApi.generateSmartBudget.mockResolvedValueOnce({
      data: mockPlan,
    });
    aiApi.applySmartBudget.mockResolvedValueOnce({
      data: { applied_count: 2 },
    });

    const onAppliedMock = vi.fn();
    render(<AutoBudgetGeneratorModal isOpen={true} onClose={vi.fn()} onBudgetApplied={onAppliedMock} />);

    const submitBtn = screen.getByRole('button', { name: /Generate AI 50\/30\/20 Smart Budget/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Apply & Activate This Budget/i)).toBeInTheDocument();
    });

    const applyBtn = screen.getByRole('button', { name: /Apply & Activate This Budget/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(aiApi.applySmartBudget).toHaveBeenCalledWith(
        expect.objectContaining({
          overall_limit: 48000,
          category_budgets: expect.arrayContaining([
            expect.objectContaining({ category_id: 'cat-1-uuid', limit_amount: 12000 }),
          ]),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/AI 50\/30\/20 Budget Activated!/i)).toBeInTheDocument();
      expect(onAppliedMock).toHaveBeenCalled();
    });
  });
});
