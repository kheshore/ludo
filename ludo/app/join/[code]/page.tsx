'use client';

// ============================================================
// Join Room Page - Join via room code from URL
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store-auth';
import { useGameStore } from '@/lib/store-game';
import { soundManager } from '@/lib/sounds';

export default function JoinPage() {
  const { user } = useAuthStore();
  const { joinRoom, room } = useGameStore();
  const router = useRouter();
  const params = useParams();
  const code = (params?.code as string)?.toUpperCase() || '';
  const [joinResult, setJoinResult] = useState<'idle' | 'joined' | 'noRoom' | 'error'>('idle');
  const [error, setError] = useState('');
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!user || !code || attemptedRef.current) return;
    attemptedRef.current = true;

    // Async join via server API
    joinRoom(code, user.id, user.nickname, user.slug).then((result) => {
      if (result.success || result.error === 'Already in room') {
        soundManager.playNotification();
        setJoinResult('joined');
        // If the game is already in progress, go straight to play
        const gs = useGameStore.getState().gameState;
        const rm = useGameStore.getState().room;
        if (gs || rm?.status === 'playing') {
          router.push('/play');
          return;
        }
        // Otherwise wait in lobby
        setTimeout(() => router.push('/home'), 1200);
      } else if (result.error === 'Room not found') {
        setJoinResult('noRoom');
      } else {
        setError(result.error || 'Could not join room');
        setJoinResult('error');
      }
    });
  }, [code, user, joinRoom, router]);

  // Poll for game state while on join page (host may start quickly)
  useEffect(() => {
    if (joinResult !== 'joined' || !code) return;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      const store = useGameStore.getState();
      await store.pollGameState(code);
      const gs = useGameStore.getState().gameState;
      const rm = useGameStore.getState().room;
      if ((gs || rm?.status === 'playing') && !cancelled) {
        cancelled = true;
        router.push('/play');
      }
    };
    // Run immediately in case game already started
    poll();
    const interval = setInterval(poll, 1500);
    return () => { cancelled = true; clearInterval(interval); };
  }, [joinResult, code, router]);

  // Derive display status from state
  const needLogin = !user;
  const loading = !needLogin && joinResult === 'idle';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-gray-950 via-gray-900 to-gray-950 px-4">
      <motion.div
        className="w-full max-w-sm text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Need to log in first */}
        {needLogin && (
          <>
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-xl font-bold text-white mb-2">Login Required</h1>
            <p className="text-white/40 text-sm mb-2">You need to sign in to join room</p>
            <div className="inline-block px-4 py-2 rounded-xl bg-white/10 mb-6">
              <span className="text-lg font-mono font-bold text-amber-400 tracking-widest">{code}</span>
            </div>
            <p className="text-white/30 text-xs mb-6">Sign in or create an account, then enter this code on the Home page.</p>
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 rounded-xl bg-blue-500 text-white font-medium text-sm hover:bg-blue-600 transition-colors"
            >
              Go to Login
            </button>
          </>
        )}

        {/* Room not found in local state — show code for manual use */}
        {joinResult === 'noRoom' && (
          <>
            <div className="text-5xl mb-4">🎲</div>
            <h1 className="text-xl font-bold text-white mb-2">Room Invite</h1>
            <p className="text-white/40 text-sm mb-4">
              Ask the host to have their room open, then join using this code:
            </p>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors mb-6"
            >
              <span className="text-2xl font-mono font-bold text-amber-400 tracking-widest">{code}</span>
              <span className="text-white/40 text-sm">📋</span>
            </button>
            <p className="text-white/30 text-xs mb-6">
              Go to Home → Create/Join Room → enter this code to join.
            </p>
            <button
              onClick={() => router.push('/home')}
              className="w-full px-6 py-3 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/20 transition-colors"
            >
              Go to Home
            </button>
          </>
        )}

        {/* Successfully joined */}
        {joinResult === 'joined' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-white mb-2">Joined Room!</h1>
            <p className="text-white/40 text-sm mb-2">Room code: {code}</p>
            <p className="text-white/30 text-xs mb-6">Waiting for host to start the game...</p>

            {room && (
              <div className="space-y-2 mb-6">
                {room.players.map(p => (
                  <div key={p.userId} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5">
                    <span className="text-sm">{p.isHost ? '👑' : '🎮'}</span>
                    <span className="text-white text-sm">{p.nickname}</span>
                    {p.isReady && <span className="text-green-400 text-xs ml-auto">Ready</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => router.push('/home')}
                className="flex-1 px-6 py-3 rounded-xl bg-blue-500 text-white font-medium text-sm hover:bg-blue-600 transition-colors"
              >
                Go to Room Lobby
              </button>
            </div>
          </>
        )}

        {/* Generic error */}
        {joinResult === 'error' && (
          <>
            <div className="text-5xl mb-4">😕</div>
            <h1 className="text-xl font-bold text-white mb-2">Could Not Join</h1>
            <p className="text-white/40 text-sm mb-6">{error}</p>
            <button
              onClick={() => router.push('/home')}
              className="w-full px-6 py-3 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/20 transition-colors"
            >
              Back to Home
            </button>
          </>
        )}

        {/* Loading */}
        {loading && (
          <>
            <div className="text-5xl mb-4 animate-pulse">🔗</div>
            <h1 className="text-xl font-bold text-white mb-2">Joining Room...</h1>
            <p className="text-white/40 text-sm">Code: {code}</p>
          </>
        )}
      </motion.div>
    </div>
  );
}
