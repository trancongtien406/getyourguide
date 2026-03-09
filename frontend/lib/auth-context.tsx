'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, authApi, cartApi, getAccessToken, setAccessToken, type User, type UserRole } from './api';
import type { GuestCartItem } from './guest-cart-context';
import { useToast } from './toast-context';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  isAdmin: boolean;
  isOperator: boolean;
  isSupplier: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Cached user in localStorage is purely cosmetic (avoid flash).
// It contains NO secrets — just display data (name, email, roles).
function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem('cachedUser');
    if (!cached) return null;
    return JSON.parse(cached) as User;
  } catch {
    return null;
  }
}

function setCachedUser(user: User | null) {
  try {
    if (user) {
      localStorage.setItem('cachedUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('cachedUser');
    }
  } catch { /* quota exceeded or private browsing */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { addToast } = useToast();

  const setUserAndCache = useCallback((u: User | null) => {
    setUser(u);
    setCachedUser(u);
  }, []);

  // Immediately after mount, restore cached user to minimise flash
  useEffect(() => {
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
    }
  }, []);

  // On mount: try to restore session.
  // If we have an in-memory accessToken, call /me.
  // If not, attempt a silent refresh (cookie-based) to get one.
  const fetchUser = useCallback(async () => {
    // 1. If we already have an access token in memory, use it
    if (getAccessToken()) {
      try {
        const userData = await authApi.me();
        setUserAndCache(userData);
        setIsLoading(false);
        return;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          // Token expired — fall through to silent refresh
          setAccessToken(null);
        } else {
          setUserAndCache(null);
          setIsLoading(false);
          return;
        }
      }
    }

    // 2. Attempt silent refresh using HttpOnly cookie
    try {
      const tokens = await authApi.refresh();
      setAccessToken(tokens.accessToken);
      const userData = await authApi.me();
      setUserAndCache(userData);
    } catch {
      // No valid refresh cookie — user is not authenticated
      setAccessToken(null);
      setUserAndCache(null);
    } finally {
      setIsLoading(false);
    }
  }, [setUserAndCache]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Sync guest cart to server after authentication
  const syncGuestCart = useCallback(async () => {
    try {
      const raw = localStorage.getItem('guestCart');
      if (!raw) return;
      const guestItems: GuestCartItem[] = JSON.parse(raw);
      if (!guestItems.length) return;

      // Add each guest cart item to server cart
      await Promise.all(
        guestItems.map(item =>
          cartApi.addItem({
            departureSlotId: item.departureSlotId,
            quantity: item.quantity,
            currencyCode: item.currencyCode,
            travelerMix: item.travelerMix,
          }).catch(() => { /* ignore individual failures */ }),
        ),
      );

      // Clear guest cart after sync
      localStorage.removeItem('guestCart');
    } catch { /* ignore sync errors */ }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    setAccessToken(response.accessToken);
    setUserAndCache(response.user);
    addToast('success', 'Logged in successfully');
    await syncGuestCart();
  };

  const register = async (data: { email: string; password: string; firstName?: string; lastName?: string }) => {
    const response = await authApi.register(data);
    setAccessToken(response.accessToken);
    setUserAndCache(response.user);
    addToast('success', 'Account created successfully');
    await syncGuestCart();
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Server-side logout failed, still clear local state
    }
    setAccessToken(null);
    setUserAndCache(null);
    addToast('info', 'You have been logged out');
  };

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false;
    return user.roles.some((r) => {
      const roleValue = typeof r === 'string' ? r : r.role;
      return roles.includes(roleValue);
    });
  };

  const isAdmin = hasRole('ADMIN');
  const isOperator = hasRole('ADMIN', 'OPERATOR');
  const isSupplier = hasRole('ADMIN', 'OPERATOR', 'SUPPLIER_ADMIN');

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        hasRole,
        isAdmin,
        isOperator,
        isSupplier,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
