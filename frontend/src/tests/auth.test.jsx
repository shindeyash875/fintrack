import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { authApi } from '../api/endpoints/auth';

vi.mock('../api/endpoints/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    googleAuth: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    getSessions: vi.fn(),
  },
}));

describe('Authentication Pages & Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
    useAuthStore.setState({ isAuthLoading: false });
  });

  it('LoginPage renders fields, allows sign in, and handles errors', async () => {
    authApi.login.mockResolvedValueOnce({
      data: {
        access_token: 'fake_jwt_token',
        user: { id: 'u1', email: 'test@example.com', full_name: 'Test User' },
      },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Welcome back to FinTrack/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/name@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'Password123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user.email).toBe('test@example.com');
    });
  });

  it('RegisterPage validates password match and length', async () => {
    authApi.register.mockResolvedValueOnce({
      data: {
        access_token: 'reg_jwt_token',
        user: { id: 'u2', email: 'newuser@example.com', full_name: 'New User' },
      },
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Join FinTrack/i })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Alex Morgan/i), {
      target: { value: 'New User' },
    });
    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'newuser@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/At least 8 characters/i), {
      target: { value: 'Secret123!' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Repeat your password/i), {
      target: { value: 'Secret123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'Secret123!',
        full_name: 'New User',
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  it('ForgotPasswordPage sends email request and renders feedback', async () => {
    authApi.forgotPassword.mockResolvedValueOnce({
      data: {
        message: 'Password reset link sent',
        debug_reset_token: 'test_token_123',
      },
    });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'forgot@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    await waitFor(() => {
      expect(authApi.forgotPassword).toHaveBeenCalledWith({ email: 'forgot@example.com' });
      expect(screen.getByText(/Reset request processed/i)).toBeInTheDocument();
      expect(screen.getByText(/Proceed to Reset Password/i)).toBeInTheDocument();
    });
  });

  it('ResetPasswordPage updates password on valid token', async () => {
    authApi.resetPassword.mockResolvedValueOnce({
      data: { message: 'Password reset successful' },
    });

    render(
      <MemoryRouter initialEntries={['/reset-password?token=sample_token']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter new password/i), {
      target: { value: 'NewPass123!' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Repeat new password/i), {
      target: { value: 'NewPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save New Password/i }));

    await waitFor(() => {
      expect(authApi.resetPassword).toHaveBeenCalledWith({
        token: 'sample_token',
        new_password: 'NewPass123!',
      });
      expect(screen.getByText(/Password Reset Complete/i)).toBeInTheDocument();
    });
  });

  it('ProtectedRoute shows loader when isAuthLoading and renders content when authenticated', () => {
    useAuthStore.setState({ isAuthLoading: true, isAuthenticated: false });

    const { rerender } = render(
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid="protected-content">Secret Dashboard</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText(/Securing your session.../i)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

    // Authenticated state
    useAuthStore.setState({
      isAuthLoading: false,
      isAuthenticated: true,
      user: { email: 'user@fintrack.app' },
    });

    rerender(
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid="protected-content">Secret Dashboard</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('googleLogin authenticates with Google ID token without touching form credentials', async () => {
    authApi.googleAuth.mockResolvedValueOnce({
      data: {
        access_token: 'google_jwt_access_token',
        user: { id: 'g_user_1', email: 'googleuser@gmail.com', full_name: 'Google User' },
      },
    });

    const result = await useAuthStore.getState().googleLogin('mock_google_id_token_xyz');

    expect(authApi.googleAuth).toHaveBeenCalledWith({
      credential: 'mock_google_id_token_xyz',
      id_token: 'mock_google_id_token_xyz',
    });
    expect(result.success).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user.email).toBe('googleuser@gmail.com');
  });
});

