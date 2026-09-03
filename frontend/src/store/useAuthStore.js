import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '../api/endpoints/auth';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isAuthLoading: false,
      authError: null,

      setAccessToken: (token) => {
        set({
          accessToken: token,
          isAuthenticated: Boolean(token),
        });
      },

      setUser: (user) => {
        set({ user });
      },

      setAuth: (user, token) => {
        set({
          user,
          accessToken: token,
          isAuthenticated: true,
          authError: null,
          isAuthLoading: false,
        });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          authError: null,
          isAuthLoading: false,
        });
      },

      setAuthLoading: (isLoading) => {
        set({ isAuthLoading: isLoading });
      },

      setAuthError: (error) => {
        set({ authError: error });
      },

      // Initialize and check current session on app boot
      checkAuth: async () => {
        const currentToken = get().accessToken;

        try {
          // Attempt silent refresh via HttpOnly cookie
          const res = await authApi.refresh();
          const { user, access_token } = res.data || res;
          set({
            user,
            accessToken: access_token,
            isAuthenticated: true,
            isAuthLoading: false,
            authError: null,
          });
          return true;
        } catch {
          // If cookie refresh fails, but we have a valid stored access token, verify with /auth/me
          if (currentToken) {
            try {
              const meRes = await authApi.getMe();
              const meUser = meRes.data || meRes;
              set({
                user: meUser,
                isAuthenticated: true,
                isAuthLoading: false,
              });
              return true;
            } catch {
              // Token genuinely expired or revoked
              get().clearAuth();
              return false;
            }
          }

          // No active session
          get().clearAuth();
          return false;
        }
      },

  // Login with email + password
  login: async (email, password) => {
    set({ isAuthLoading: true, authError: null });
    try {
      const res = await authApi.login({ email, password });
      const { user, access_token } = res.data || res;
      set({
        user,
        accessToken: access_token,
        isAuthenticated: true,
        isAuthLoading: false,
        authError: null,
      });
      return { success: true, user };
    } catch (err) {
      const msg = err.message || 'Invalid email or password';
      set({ authError: msg, isAuthLoading: false });
      return { success: false, error: msg };
    }
  },

  // Register new account
  register: async (email, password, full_name) => {
    set({ isAuthLoading: true, authError: null });
    try {
      const res = await authApi.register({ email, password, full_name });
      const { user, access_token } = res.data || res;
      set({
        user,
        accessToken: access_token,
        isAuthenticated: true,
        isAuthLoading: false,
        authError: null,
      });
      return { success: true, user };
    } catch (err) {
      const msg = err.message || 'Registration failed. Please try again.';
      set({ authError: msg, isAuthLoading: false });
      return { success: false, error: msg };
    }
  },

  // Google OAuth / GIS Sign-in
  googleLogin: async (idToken) => {
    set({ isAuthLoading: true, authError: null });
    try {
      const res = await authApi.googleAuth({ credential: idToken, id_token: idToken });
      const { user, access_token } = res.data || res;
      set({
        user,
        accessToken: access_token,
        isAuthenticated: true,
        isAuthLoading: false,
        authError: null,
      });
      return { success: true, user };
    } catch (err) {
      const msg = err.message || 'Google sign-in failed. Please try again.';
      set({ authError: msg, isAuthLoading: false });
      return { success: false, error: msg };
    }
  },

  // Logout current session
  logout: async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('[AuthStore] Logout API error:', err);
    } finally {
      get().clearAuth();
    }
  },

  // Logout from all devices
  logoutAll: async () => {
    try {
      await authApi.logoutAll();
    } catch (err) {
      console.warn('[AuthStore] Logout All API error:', err);
    } finally {
      get().clearAuth();
    }
  },

  // Change password for logged-in user
  changePassword: async (currentPassword, newPassword) => {
    return await authApi.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  // Forgot password email request
  forgotPassword: async (email) => {
    return await authApi.forgotPassword({ email });
  },

  // Reset password with token
  resetPassword: async (token, newPassword) => {
    return await authApi.resetPassword({
      token,
      new_password: newPassword,
    });
  },

  // Verify email with token
  verifyEmail: async (token) => {
    const res = await authApi.verifyEmail({ token });
    const data = res.data || res;
    if (get().user) {
      set({ user: { ...get().user, is_verified: true } });
    }
    return data;
  },

  // Resend verification email
  resendVerification: async (email) => {
    return await authApi.resendVerification({ email });
  },
    }),
    {
      name: 'fintrack_auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
