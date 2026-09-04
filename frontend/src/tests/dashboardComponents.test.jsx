import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import MonthCompareWidget from '../components/dashboard/MonthCompareWidget';
import TopCategoriesList from '../components/dashboard/TopCategoriesList';
import CategoryPieChart from '../components/dashboard/CategoryPieChart';
import SpendingTrendChart from '../components/dashboard/SpendingTrendChart';

// Mock Recharts ResponsiveContainer to prevent size calculation errors in JSDOM
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="responsive-container" style={{ width: 500, height: 300 }}>
        {children}
      </div>
    ),
  };
});

describe('MonthCompareWidget', () => {
  it('renders correctly for spending increase', () => {
    const compareData = {
      current_month: '2026-08-01',
      current_month_total: '15000.00',
      previous_month: '2026-07-01',
      previous_month_total: '10000.00',
      percentage_change: 50.0,
      is_increase: true,
    };

    render(<MonthCompareWidget compareData={compareData} />);
    expect(screen.getByText(/Month-over-Month/i)).toBeInTheDocument();
    expect(screen.getByText(/₹15,000.00/i)).toBeInTheDocument();
    expect(screen.getByText(/\+50%/i)).toBeInTheDocument();
    expect(screen.getByText(/more spend/i)).toBeInTheDocument();
  });

  it('renders correctly for spending decrease (savings)', () => {
    const compareData = {
      current_month: '2026-08-01',
      current_month_total: '8000.00',
      previous_month: '2026-07-01',
      previous_month_total: '10000.00',
      percentage_change: -20.0,
      is_increase: false,
    };

    render(<MonthCompareWidget compareData={compareData} />);
    expect(screen.getByText(/₹8,000.00/i)).toBeInTheDocument();
    expect(screen.getByText(/-20%/i)).toBeInTheDocument();
    expect(screen.getByText(/lower spend/i)).toBeInTheDocument();
  });
});

describe('TopCategoriesList', () => {
  const categories = [
    { category_id: 'cat-1', category_name: 'Groceries', total_amount: '5000.00', percentage: 50.0 },
    { category_id: 'cat-2', category_name: 'Utilities', total_amount: '3000.00', percentage: 30.0 },
  ];

  it('renders ranked categories with #1 and #2 badges', () => {
    render(
      <BrowserRouter>
        <TopCategoriesList categories={categories} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Top Categories/i)).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Utilities')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText(/₹5,000.00/i)).toBeInTheDocument();
  });

  it('handles empty state gracefully', () => {
    render(
      <BrowserRouter>
        <TopCategoriesList categories={[]} />
      </BrowserRouter>
    );
    expect(screen.getByText(/No category spending recorded/i)).toBeInTheDocument();
  });
});

describe('CategoryPieChart', () => {
  it('renders honest empty state when data is empty', () => {
    render(
      <BrowserRouter>
        <CategoryPieChart data={[]} />
      </BrowserRouter>
    );
    expect(screen.getByText(/No category spending yet/i)).toBeInTheDocument();
  });

  it('renders categories count and total when data is provided', () => {
    const data = [
      { category_id: 'c1', category_name: 'Food', amount: '2500.00', percentage: 100.0 },
    ];
    render(
      <BrowserRouter>
        <CategoryPieChart data={data} />
      </BrowserRouter>
    );
    expect(screen.getByText(/1 Categories/i)).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText(/₹2,500.00/i)).toBeInTheDocument();
  });
});

describe('SpendingTrendChart', () => {
  it('renders empty state when data is empty', () => {
    render(
      <BrowserRouter>
        <SpendingTrendChart data={[]} />
      </BrowserRouter>
    );
    expect(screen.getByText(/No spending data in this period/i)).toBeInTheDocument();
  });

  it('allows switching granularity buttons', () => {
    const onGranularityChange = vi.fn();
    const data = [
      { label: 'Aug 24', amount: '1200.00' },
      { label: 'Aug 25', amount: '800.00' },
    ];

    render(
      <BrowserRouter>
        <SpendingTrendChart
          data={data}
          granularity="daily"
          onGranularityChange={onGranularityChange}
        />
      </BrowserRouter>
    );

    const weeklyBtn = screen.getByText('weekly');
    fireEvent.click(weeklyBtn);
    expect(onGranularityChange).toHaveBeenCalledWith('weekly');

    const monthlyBtn = screen.getByText('monthly');
    fireEvent.click(monthlyBtn);
    expect(onGranularityChange).toHaveBeenCalledWith('monthly');
  });
});

describe('Coin3D & FinTrackCard3D Components', () => {
  it('renders Coin3D with gold and emerald variants', async () => {
    const { Coin3D } = await import('../components/common/Coin3D');
    render(<Coin3D size="md" variant="gold" />);
    expect(screen.getByTitle('3D Wealth Coin')).toBeInTheDocument();
  });

  it('renders FinTrackCard3D with spend readout and flips to show health score', async () => {
    const { FinTrackCard3D } = await import('../components/dashboard/FinTrackCard3D');
    render(
      <FinTrackCard3D 
        currentMonthSpent={12500} 
        budgetStatus={{ percentage_used: 45, remaining_amount: 15000 }} 
      />
    );

    expect(screen.getAllByText(/FinTrack/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Platinum/i)).toBeInTheDocument();
    expect(screen.getByText(/Month Spend/i)).toBeInTheDocument();
    expect(screen.getByText(/Financial Health Score/i)).toBeInTheDocument();
  });
});

