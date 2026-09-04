import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MonthlyDigestModal } from '../components/ai/MonthlyDigestModal';
import { aiApi } from '../api/endpoints/ai';

vi.mock('../api/endpoints/ai', () => ({
  aiApi: {
    getMonthlyDigest: vi.fn(),
  },
}));

describe('MonthlyDigestModal Component', () => {
  const mockDigestData = {
    month: '2026-09',
    month_name: 'September 2026',
    health_score: 88,
    grade: 'A',
    headline: 'Strong financial discipline with ₹5,000 budget surplus',
    executive_summary: 'You spent ₹15,000 against a ₹20,000 budget limit, keeping all major categories within target.',
    total_spent: 15000.0,
    budget_limit: 20000.0,
    savings_or_deficit: 5000.0,
    total_transactions: 14,
    daily_average: 500.0,
    top_spending_leaks: [
      {
        category: 'Dining Out',
        leak_amount: 1200.0,
        severity: 'medium',
        pattern_reason: 'Frequent weekend restaurant deliveries',
        recommendation: 'Cap weekend takeout orders to once per week',
      },
    ],
    biggest_wins: [
      'Stayed ₹5,000 under overall monthly budget',
      'Grocery spending decreased by 15%',
    ],
    action_plan_next_month: [
      'Set an automated ₹5,000 transfer to emergency savings',
      'Prepare weekend meal plan to curb impulse food orders',
    ],
    category_insights: [
      {
        category_name: 'Groceries',
        total_spent: 6000.0,
        budget_limit: 8000.0,
        status: 'within_budget',
        insight: 'Excellent staple grocery management',
      },
      {
        category_name: 'Dining Out',
        total_spent: 4200.0,
        budget_limit: 3000.0,
        status: 'over_budget',
        insight: 'Slight overrun due to festive celebration',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<MonthlyDigestModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/AI Monthly Health Digest/i)).not.toBeInTheDocument();
  });

  it('fetches and renders monthly digest metrics, health score, and headline when open', async () => {
    aiApi.getMonthlyDigest.mockResolvedValueOnce({
      data: mockDigestData,
    });

    render(<MonthlyDigestModal isOpen={true} onClose={vi.fn()} />);

    // Check loading indicator first
    expect(screen.getByText(/Synthesizing Financial Scorecard/i)).toBeInTheDocument();

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText(/88/)).toBeInTheDocument();
      expect(screen.getByText(/GRADE A/i)).toBeInTheDocument();
      expect(screen.getByText(/Strong financial discipline with ₹5,000 budget surplus/i)).toBeInTheDocument();
    });

    // Check high level metrics
    expect(screen.getByText('₹15,000')).toBeInTheDocument();
    expect(screen.getByText('₹20,000')).toBeInTheDocument();
    expect(screen.getByText('+₹5,000')).toBeInTheDocument();
  });

  it('allows tab switching between Wins, Leaks, Action Plan, and Categories', async () => {
    aiApi.getMonthlyDigest.mockResolvedValueOnce({
      data: mockDigestData,
    });

    render(<MonthlyDigestModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Strong financial discipline/i)).toBeInTheDocument();
    });

    // Switch to Wins tab
    const winsTab = screen.getByRole('button', { name: /Wins/i });
    fireEvent.click(winsTab);
    expect(screen.getByText(/Grocery spending decreased by 15%/i)).toBeInTheDocument();

    // Switch to Spending Leaks tab
    const leaksTab = screen.getByRole('button', { name: /Spending Leaks/i });
    fireEvent.click(leaksTab);
    expect(screen.getByText(/Frequent weekend restaurant deliveries/i)).toBeInTheDocument();
    expect(screen.getByText(/Cap weekend takeout orders to once per week/i)).toBeInTheDocument();

    // Switch to Action Plan tab
    const actionTab = screen.getByRole('button', { name: /Next Month Plan/i });
    fireEvent.click(actionTab);
    expect(screen.getByText(/Set an automated ₹5,000 transfer to emergency savings/i)).toBeInTheDocument();

    // Switch to Categories tab
    const catTab = screen.getByRole('button', { name: /Categories/i });
    fireEvent.click(catTab);
    expect(screen.getByText(/Excellent staple grocery management/i)).toBeInTheDocument();
    expect(screen.getByText(/WITHIN BUDGET/i)).toBeInTheDocument();
  });

  it('calls onClose when close or Done button is clicked', async () => {
    aiApi.getMonthlyDigest.mockResolvedValueOnce({
      data: mockDigestData,
    });
    const handleClose = vi.fn();

    render(<MonthlyDigestModal isOpen={true} onClose={handleClose} />);

    await waitFor(() => {
      expect(screen.getByText(/GRADE A/i)).toBeInTheDocument();
    });

    const doneButton = screen.getByRole('button', { name: /Done/i });
    fireEvent.click(doneButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
