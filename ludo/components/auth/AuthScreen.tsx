'use client';

// ============================================================
// AuthScreen - Login / Signup UI
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/store-auth';
import { validatePassword, validateUsername } from '@/lib/utils';
import { soundManager } from '@/lib/sounds';
import type { FormEvent } from 'react';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signup, login } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const usernameCheck = validateUsername(username);
        if (!usernameCheck.valid) {
          setError(usernameCheck.message);
          return;
        }
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.valid) {
          setError(passwordCheck.message);
          return;
        }

        const result = await signup(username, nickname || username, password);
        if (!result.success) {
          setError(result.error || 'Signup failed');
          return;
        }
      } else {
        if (!username || !password) {
          setError('Please fill in all fields');
          return;
        }
        const result = await login(username, password);
        if (!result.success) {
          setError(result.error || 'Login failed');
          return;
        }
      }

      soundManager.playClick();
      onSuccess?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-gray-950 via-gray-900 to-gray-950 px-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            className="text-6xl mb-3"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            🎲
          </motion.div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Ludo</h1>
          <p className="text-white/40 text-sm mt-1">Play. Compete. Win.</p>
        </div>

        {/* Toggle */}
        <div className="flex bg-white/5 rounded-xl p-1 mb-6">
          {(['login', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === m
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/50 font-medium mb-1.5 block">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all text-sm"
              autoCapitalize="off"
              autoComplete="username"
            />
          </div>

          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <label className="text-xs text-white/50 font-medium mb-1.5 block">
                  Nickname (optional)
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="Display name in games"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all text-sm"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="text-xs text-white/50 font-medium mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all text-sm pr-12"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-sm"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {mode === 'signup' && (
              <p className="text-[10px] text-white/30 mt-1.5">
                Min 8 chars, uppercase, lowercase & number
              </p>
            )}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </motion.button>
        </form>

        <p className="text-center text-white/20 text-xs mt-6">
          No email or phone required • Just pick a username
        </p>
      </motion.div>
    </div>
  );
}
