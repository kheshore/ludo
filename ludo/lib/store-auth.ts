// ============================================================
// Auth Store - User authentication state management
// Backed by MongoDB via API routes
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserStats } from './types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  signup: (username: string, nickname: string, password: string) => Promise<{ success: boolean; error?: string }>;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: { nickname?: string }) => Promise<void>;
  updateStats: (updates: Partial<UserStats>) => Promise<void>;

  // Friends
  sendFriendRequest: (targetSlug: string) => Promise<{ success: boolean; error?: string }>;
  acceptFriendRequest: (fromUserId: string) => Promise<void>;
  declineFriendRequest: (fromUserId: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
  getUserBySlug: (slug: string) => Promise<User | null>;
  getUserById: (id: string) => Promise<User | null>;

  // Refresh current user from DB
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      signup: async (username, nickname, password) => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, nickname, password }),
          });

          const data = await res.json();
          if (!data.success) {
            set({ isLoading: false });
            return { success: false, error: data.error };
          }

          set({ user: data.user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch {
          set({ isLoading: false });
          return { success: false, error: 'Network error' };
        }
      },

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });

          const data = await res.json();
          if (!data.success) {
            set({ isLoading: false });
            return { success: false, error: data.error };
          }

          set({ user: data.user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch {
          set({ isLoading: false });
          return { success: false, error: 'Network error' };
        }
      },

      logout: async () => {
        const state = get();
        if (state.user) {
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: state.user.id }),
            });
          } catch {
            // Ignore logout API failures
          }
        }
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: async (data) => {
        const state = get();
        if (!state.user) return;

        // Optimistic update
        const optimisticUser = { ...state.user, ...data };
        set({ user: optimisticUser });

        try {
          const res = await fetch('/api/auth/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.id, ...data }),
          });

          const result = await res.json();
          if (result.success) {
            set({ user: result.user });
          }
        } catch {
          // Revert on failure
          set({ user: state.user });
        }
      },

      updateStats: async (updates) => {
        const state = get();
        if (!state.user) return;

        // Optimistic update
        const updatedStats = { ...state.user.stats, ...updates };
        const optimisticUser = { ...state.user, stats: updatedStats };
        set({ user: optimisticUser });

        try {
          const res = await fetch('/api/auth/stats', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.id, stats: updates }),
          });

          const result = await res.json();
          if (result.success) {
            set({ user: result.user });
          }
        } catch {
          // Keep optimistic update — stats will sync on next login
        }
      },

      sendFriendRequest: async (targetSlug) => {
        const state = get();
        if (!state.user) return { success: false, error: 'Not logged in' };

        try {
          const res = await fetch('/api/friends/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.id, targetSlug }),
          });

          const data = await res.json();
          return { success: data.success, error: data.error };
        } catch {
          return { success: false, error: 'Network error' };
        }
      },

      acceptFriendRequest: async (fromUserId) => {
        const state = get();
        if (!state.user) return;

        try {
          const res = await fetch('/api/friends/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.id, fromUserId }),
          });

          const data = await res.json();
          if (data.success) {
            set({ user: data.user });
          }
        } catch {
          // Ignore
        }
      },

      declineFriendRequest: async (fromUserId) => {
        const state = get();
        if (!state.user) return;

        try {
          const res = await fetch('/api/friends/decline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.id, fromUserId }),
          });

          const data = await res.json();
          if (data.success) {
            set({ user: data.user });
          }
        } catch {
          // Ignore
        }
      },

      removeFriend: async (userId) => {
        const state = get();
        if (!state.user) return;

        // Optimistic update
        const optimisticUser = {
          ...state.user,
          friends: state.user.friends.filter((id) => id !== userId),
        };
        set({ user: optimisticUser });

        try {
          const res = await fetch('/api/friends/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.id, friendId: userId }),
          });

          const data = await res.json();
          if (data.success) {
            set({ user: data.user });
          }
        } catch {
          // Revert
          set({ user: state.user });
        }
      },

      getUserBySlug: async (slug) => {
        try {
          const res = await fetch(`/api/users/${slug}`);
          const data = await res.json();
          return data.success ? data.user : null;
        } catch {
          return null;
        }
      },

      getUserById: async (id) => {
        try {
          const res = await fetch(`/api/users/id/${id}`);
          const data = await res.json();
          return data.success ? data.user : null;
        } catch {
          return null;
        }
      },

      refreshUser: async () => {
        const state = get();
        if (!state.user) return;

        try {
          const res = await fetch(`/api/users/id/${state.user.id}`);
          const data = await res.json();
          if (data.success) {
            set({ user: data.user });
          }
        } catch {
          // Keep cached user
        }
      },
    }),
    {
      name: 'ludo-auth',
      partialize: (state: AuthState) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      } as AuthState),
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          const value = localStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return;
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return;
          localStorage.removeItem(name);
        },
      },
    }
  )
);
