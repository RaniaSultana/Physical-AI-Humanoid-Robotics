/**
 * Authentication context provider for managing user state.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, User, BackgroundData } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateBackground: (data: BackgroundData) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'ai_textbook_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      api.setToken(token);

      try {
        const user = await api.getCurrentUser();
        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } catch {
        // Token invalid, clear it
        localStorage.removeItem(TOKEN_KEY);
        api.setToken(null);
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
      }
    };

    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { user, access_token } = await api.login(email, password);
      localStorage.setItem(TOKEN_KEY, access_token);
      api.setToken(access_token);

      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed',
      }));
      throw err;
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const { user, access_token } = await api.register(email, password, displayName);
        localStorage.setItem(TOKEN_KEY, access_token);
        api.setToken(access_token);

        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } catch (err) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Registration failed',
        }));
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      api.setToken(null);
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    }
  }, []);

  const updateBackground = useCallback(async (data: BackgroundData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const user = await api.updateBackground(data);
      setState(prev => ({
        ...prev,
        user,
        isLoading: false,
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to update background',
      }));
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        updateBackground,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  // Return a safe default during SSR when AuthProvider is not available
  if (context === undefined) {
    // Check if we're in browser
    if (typeof window === 'undefined') {
      // SSR fallback - return safe defaults
      return {
        user: null,
        isLoading: true,
        isAuthenticated: false,
        error: null,
        login: async () => {},
        register: async () => {},
        logout: async () => {},
        updateBackground: async () => {},
        clearError: () => {},
      } as AuthContextValue;
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
