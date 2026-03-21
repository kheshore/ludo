'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store-auth';
import { useGameStore } from '@/lib/store-game';
import GameScreen from '@/components/game/GameScreen';
import { useEffect, useRef, useState } from 'react';

export default function PlayPage() {
  const { user } = useAuthStore();
  const { gameState, room } = useGameStore();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  // Track how many poll attempts we've made without getting a gameState
  const pollAttemptsRef = useRef(0);
  const MAX_POLL_ATTEMPTS = 10; // 10 × 800ms = 8 seconds grace period

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }

    // Already have gameState — show the game
    if (gameState) {
      setReady(true);
      return;
    }

    // No room and no gameState — nothing to show
    if (!room?.code) {
      router.replace('/home');
      return;
    }

    // Multiplayer: keep polling until gameState arrives
    let cancelled = false;

    const attempt = async () => {
      if (cancelled) return;
      await useGameStore.getState().pollGameState(room.code);
      const gs = useGameStore.getState().gameState;
      if (gs) {
        if (!cancelled) setReady(true);
        return;
      }
      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        // Genuinely no game — go back to lobby
        if (!cancelled) router.replace('/home');
        return;
      }
      // Try again after 800ms
      setTimeout(attempt, 800);
    };

    attempt();
    return () => { cancelled = true; };
  }, [user, gameState, room, router]);

  if (!user || !ready || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-white/50 text-sm animate-pulse">Loading game...</div>
      </div>
    );
  }

  return <GameScreen />;
}
