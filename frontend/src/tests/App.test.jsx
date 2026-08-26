import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import App from '../App';

describe('App Component', () => {
  it('renders the FinTrack brand and navigation', () => {
    render(<App />);
    expect(screen.getAllByText(/FinTrack/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Dashboard/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Expenses/i)[0]).toBeInTheDocument();
  });
});
