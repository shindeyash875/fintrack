import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExportModal from '../components/expenses/ExportModal';
import ImportModal from '../components/expenses/ImportModal';
import { expensesApi } from '../api/endpoints/expenses';

vi.mock('../api/endpoints/expenses', () => ({
  expensesApi: {
    exportCsv: vi.fn().mockResolvedValue({ data: 'Date,Title,Category,Amount\n2026-08-26,Test,Food,100' }),
    exportJson: vi.fn().mockResolvedValue({ data: '[{"title":"Test"}]' }),
    importCsv: vi.fn(),
  },
}));

describe('ExportModal Component', () => {
  it('renders format and scope options', () => {
    render(
      <ExportModal
        isOpen={true}
        onClose={vi.fn()}
        activeFilters={{ search: 'lunch' }}
        filteredCount={5}
      />
    );

    expect(screen.getByText(/Export Expenses Data/i)).toBeInTheDocument();
    expect(screen.getByText(/CSV Document/i)).toBeInTheDocument();
    expect(screen.getByText(/JSON Data/i)).toBeInTheDocument();
    expect(screen.getByText(/Filtered View/i)).toBeInTheDocument();
    expect(screen.getByText(/All Lifetime Records/i)).toBeInTheDocument();
    expect(screen.getByText(/5 items/i)).toBeInTheDocument();
  });

  it('switches export format from CSV to JSON', () => {
    render(
      <ExportModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const jsonBtn = screen.getByText(/JSON Data/i).closest('button');
    fireEvent.click(jsonBtn);
    expect(screen.getByText(/Download JSON/i)).toBeInTheDocument();
  });
});

describe('ImportModal Component', () => {
  it('renders upload box and template button', () => {
    render(
      <ImportModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Import Expenses from CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Required CSV Columns/i)).toBeInTheDocument();
    expect(screen.getByText(/Sample Template/i)).toBeInTheDocument();
    expect(screen.getByText(/Click to browse or drop your CSV file here/i)).toBeInTheDocument();
  });

  it('has disabled Start Import button when no file selected', () => {
    render(
      <ImportModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const importBtn = screen.getByRole('button', { name: /Start Import/i });
    expect(importBtn).toBeDisabled();
  });
});
