import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import App from '../App';
import { useAuthStore } from '../store/useAuthStore';
import { authApi } from '../api/endpoints/auth';

vi.mock('../api/endpoints/auth', () => ({
  authApi: {
    refresh: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('App Component', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    vi.clearAllMocks();
    authApi.refresh.mockReset();
    useAuthStore.getState().clearAuth();
  });

  it('renders login page when unauthenticated', async () => {
    authApi.refresh.mockRejectedValue(new Error('No active session'));
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back to FinTrack/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/name@example.com/i)).toBeInTheDocument();
    });
  });

  it('renders dashboard layout when authenticated', async () => {
    authApi.refresh.mockResolvedValue({
      user: { id: 'u1', email: 'alex@example.com', full_name: 'Alex Morgan' },
      access_token: 'valid_access_token',
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText(/FinTrack/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Dashboard/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Expenses/i)[0]).toBeInTheDocument();
    });
  });
});
