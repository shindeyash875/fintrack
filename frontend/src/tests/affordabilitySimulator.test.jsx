import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AffordabilitySimulatorModal } from '../components/ai/AffordabilitySimulatorModal';
import { aiApi } from '../api/endpoints/ai';

vi.mock('../api/endpoints/ai', () => ({
  aiApi: {
    simulateAffordability: vi.fn(),
  },
}));

describe('AffordabilitySimulatorModal Component', () => {
  const mockSimulationResult = {
    verdict: 'SAFE_TO_BUY',
    verdict_title: 'Safe to Buy: ₹4,500 fits comfortably in your budget',
    verdict_description: 'You have ample monthly headroom to make this purchase without straining cash flow.',
    item_name: 'Sony WH-1000XM5 Headphones',
    amount: 4500.0,
    monthly_commitment: 4500.0,
    affordability_score: 88,
    impact: {
      current_category_spent: 1200.0,
      category_budget_limit: 8000.0,
      category_remaining_after: 2300.0,
      overall_spent: 10000.0,
      overall_budget_limit: 30000.0,
      overall_remaining_after: 15500.0,
      daily_budget_before: 800.0,
      daily_budget_after: 620.0,
      days_remaining_in_month: 25,
    },
    recommendations: [
      'Log the purchase immediately to keep budget gauges synchronized',
      'Maintain daily spending below ₹620/day for the next 25 days',
    ],
    alternative_strategies: [
      'Check for 3-month no-cost EMI to lower monthly deduction to ₹1,500/mo',
      'Look for card discount offers or cashback deals at checkout',
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<AffordabilitySimulatorModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/Can I Afford This\?/i)).not.toBeInTheDocument();
  });

  it('renders form fields when open and submits simulation payload', async () => {
    aiApi.simulateAffordability.mockResolvedValueOnce({
      data: mockSimulationResult,
    });

    render(<AffordabilitySimulatorModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/Can I Afford This\?/i)).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/Sony Wireless Headphones/i);
    const amountInput = screen.getByPlaceholderText('0.00');

    fireEvent.change(nameInput, { target: { value: 'Sony WH-1000XM5 Headphones' } });
    fireEvent.change(amountInput, { target: { value: '4500' } });

    const submitBtn = screen.getByRole('button', { name: /Simulate Affordability/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(aiApi.simulateAffordability).toHaveBeenCalledWith(
        expect.objectContaining({
          item_name: 'Sony WH-1000XM5 Headphones',
          amount: 4500,
          payment_method: 'one_time',
        })
      );
    });

    // Check rendered results
    await waitFor(() => {
      expect(screen.getByText('SAFE TO BUY')).toBeInTheDocument();
      expect(screen.getByText(/88\/100 Score/i)).toBeInTheDocument();
      expect(screen.getByText(/fits comfortably in your budget/i)).toBeInTheDocument();
      expect(screen.getByText(/Maintain daily spending/i)).toBeInTheDocument();
    });
  });

  it('allows selecting EMI option and adjusting duration', async () => {
    aiApi.simulateAffordability.mockResolvedValueOnce({
      data: {
        ...mockSimulationResult,
        monthly_commitment: 1500.0,
      },
    });

    render(<AffordabilitySimulatorModal isOpen={true} onClose={vi.fn()} />);

    const emiBtn = screen.getByRole('button', { name: 'EMI' });
    fireEvent.click(emiBtn);

    expect(screen.getByText(/EMI Duration/i)).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/Sony Wireless Headphones/i);
    const amountInput = screen.getByPlaceholderText('0.00');

    fireEvent.change(nameInput, { target: { value: 'Sony WH-1000XM5 Headphones' } });
    fireEvent.change(amountInput, { target: { value: '4500' } });

    const submitBtn = screen.getByRole('button', { name: /Simulate Affordability/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(aiApi.simulateAffordability).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method: 'emi',
          emi_months: 3,
        })
      );
    });
  });

  it('allows resetting to simulate another item', async () => {
    aiApi.simulateAffordability.mockResolvedValueOnce({
      data: mockSimulationResult,
    });

    render(<AffordabilitySimulatorModal isOpen={true} onClose={vi.fn()} />);

    const nameInput = screen.getByPlaceholderText(/Sony Wireless Headphones/i);
    const amountInput = screen.getByPlaceholderText('0.00');

    fireEvent.change(nameInput, { target: { value: 'Sony WH-1000XM5 Headphones' } });
    fireEvent.change(amountInput, { target: { value: '4500' } });

    const submitBtn = screen.getByRole('button', { name: /Simulate Affordability/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('SAFE TO BUY')).toBeInTheDocument();
    });

    const resetBtn = screen.getByRole('button', { name: /Simulate Another Item/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Sony Wireless Headphones/i)).toBeInTheDocument();
    });
  });
});
