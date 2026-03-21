'use client';

// ============================================================
// Home Page - Main menu with play options
// ============================================================

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store-auth';
import { useGameStore } from '@/lib/store-game';
import { COLOR_CONFIG } from '@/lib/types';
import BottomNav from '@/components/nav/BottomNav';
import { soundManager } from '@/lib/sounds';
import { generateInviteLink } from '@/lib/utils';

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { user } = useAuthStore();
  const { startQuickGame, createRoom, addBotToRoom, removeBotFromRoom } = useGameStore();
  const room = useGameStore(s => s.room);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [showQuickPlay, setShowQuickPlay] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [startError, setStartError] = useState('');

  useEffect(() => {
    if (!user) router.replace('/');
  }, [user, router]);

  // Handle redirect from friends page with ?room=CODE&invited=NAME
  useEffect(() => {
    const roomParam = searchParams?.get('room');
    const invitedParam = searchParams?.get('invited');
    if (roomParam && room) {
      // Use setTimeout to avoid React Compiler's synchronous setState warning
      setTimeout(() => {
        setRoomCode(roomParam);
        if (invitedParam) {
          setInviteMsg(`Room created! Share the invite link with ${invitedParam} 📋`);
          setTimeout(() => setInviteMsg(''), 5000);
        }
      }, 0);
      // Clean up the URL
      router.replace('/home');
    }
  }, [searchParams, room, router]);

  // Poll room state every 2s so we see new players / host start
  // Also directly poll game state and redirect when game has started
  useEffect(() => {
    const code = room?.code;
    if (!code) return;

    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      const store = useGameStore.getState();

      // Refresh room info first — this gives us the latest status from the server
      await store.refreshRoom(code);
      const updatedRoom = useGameStore.getState().room;
      console.log(`[home poll] code=${code} roomStatus=${updatedRoom?.status}`);

      // If the room is playing, fetch the game state and redirect
      if (updatedRoom?.status === 'playing') {
        await store.pollGameState(code);
        const gs = useGameStore.getState().gameState;
        console.log(`[home poll] status=playing hasGs=${!!gs}`);
        if (gs && !cancelled) {
          cancelled = true;
          router.push('/play');
        }
      }
    };

    // Run immediately on mount to catch already-started games
    poll();

    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [room?.code, router]);

  if (!user) {
    return <div className="min-h-screen bg-gray-950" />;
  }

  const isHost = room?.players.some(p => p.userId === user.id && p.isHost) ?? false;

  const handleQuickPlay = (botCount: number) => {
    soundManager.playClick();
    startQuickGame(user.id, user.nickname, user.slug, botCount);
    router.push('/play');
  };

  const handleCreateRoom = async () => {
    soundManager.playClick();
    try {
      const code = await createRoom(user.id, user.nickname, user.slug);
      setRoomCode(code);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create room';
      setStartError(msg);
    }
  };

  const handleJoinRoom = () => {
    if (joinCode.length >= 4) {
      soundManager.playClick();
      router.push(`/join/${joinCode.toUpperCase()}`);
    }
  };

  const handleCopyInvite = async () => {
    const code = roomCode || room?.code;
    if (code) {
      const link = generateInviteLink(code);
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartRoom = async () => {
    soundManager.playClick();
    setStartError('');
    try {
      await useGameStore.getState().startGame(user.id);
      router.push('/play');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start game';
      console.error('[handleStartRoom]', msg);
      setStartError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-950 via-gray-900 to-gray-950 pb-20">
      {/* Header */}
      <div className="px-4 pt-8 pb-6 text-center">
        <motion.div
          className="text-5xl mb-2"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          🎲
        </motion.div>
        <h1 className="text-2xl font-bold text-white">Welcome, {user.nickname}!</h1>
        <p className="text-white/40 text-sm mt-1">{user.avatar} @{user.slug}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-8">
        {[
          { label: 'Played', value: user.stats.gamesPlayed, icon: '🎮' },
          { label: 'Won', value: user.stats.gamesWon, icon: '🏆' },
          { label: 'Streak', value: user.stats.winStreak, icon: '🔥' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="bg-white/5 rounded-2xl p-4 text-center border border-white/5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="text-lg mb-1">{stat.icon}</div>
            <div className="text-xl font-bold text-white">{stat.value}</div>
            <div className="text-[10px] text-white/40 mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Play Options */}
      <div className="px-4 space-y-3">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">
          Play Now
        </h2>

        {/* Quick Play */}
        <motion.button
          onClick={() => { setShowQuickPlay(!showQuickPlay); soundManager.playClick(); }}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all group"
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            ⚡
          </div>
          <div className="text-left flex-1">
            <div className="text-white font-semibold">Quick Play</div>
            <div className="text-white/40 text-xs">Play vs AI bots instantly</div>
          </div>
          <span className={`text-white/30 text-sm transition-transform ${showQuickPlay ? 'rotate-180' : ''}`}>▼</span>
        </motion.button>

        {showQuickPlay && (
          <motion.div
            className="flex gap-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <button
              onClick={() => handleQuickPlay(1)}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              <span className="text-2xl">👥</span>
              <span className="text-white font-semibold text-sm">2 Players</span>
              <span className="text-white/40 text-[10px]">You vs 1 Bot</span>
            </button>
            <button
              onClick={() => handleQuickPlay(3)}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              <span className="text-2xl">👥👥</span>
              <span className="text-white font-semibold text-sm">4 Players</span>
              <span className="text-white/40 text-[10px]">You vs 3 Bots</span>
            </button>
          </motion.div>
        )}

        {/* Create Room */}
        <motion.button
          onClick={handleCreateRoom}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all group"
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            🏠
          </div>
          <div className="text-left">
            <div className="text-white font-semibold">Create Room</div>
            <div className="text-white/40 text-xs">Invite friends to play</div>
          </div>
        </motion.button>

        {/* Room Panel — shown when user is in a room (as host or joiner) */}
        {room && (
          <motion.div
            className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            {/* Invite message notification */}
            {inviteMsg && (
              <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs text-center">
                {inviteMsg}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Room Code:</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white tracking-widest">{room.code}</span>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(room.code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-colors"
                  title="Copy room code"
                >
                  {copied ? (
                    <span className="text-green-400 text-xs font-medium px-0.5">✓</span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Players in room */}
            <div className="space-y-1.5">
              <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
                Players ({room.players.length}/{room.maxPlayers})
              </span>
              {room.players.map((p) => (
                <div key={p.userId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLOR_CONFIG[p.color].hex }}
                  />
                  <span className="text-sm text-white flex-1">{p.nickname}</span>
                  {p.isHost && <span className="text-[10px] text-amber-400">HOST</span>}
                  {p.isBot && isHost && (
                    <button
                      onClick={async () => { await removeBotFromRoom(room.players.filter(pl => pl.isBot).indexOf(p)); soundManager.playClick(); }}
                      className="text-white/30 hover:text-red-400 text-xs transition-colors"
                    >
                      ✕
                    </button>
                  )}
                  {!p.isBot && !p.isHost && <span className="text-[10px] text-green-400">JOINED</span>}
                </div>
              ))}

              {/* Add Bot button — host only */}
              {isHost && room.players.length < room.maxPlayers && (
                <button
                  onClick={async () => { await addBotToRoom(); soundManager.playClick(); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-dashed border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10 text-xs transition-colors"
                >
                  🤖 Add Bot
                </button>
              )}
            </div>

            {isHost ? (
              <div className="flex flex-col gap-2">
                {startError && (
                  <p className="text-red-400 text-xs text-center">{startError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyInvite}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                  >
                    {copied ? '✓ Copied!' : '📋 Copy Link'}
                  </button>
                  <button
                    onClick={handleStartRoom}
                    disabled={room.players.length < 2}
                    className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ▶ Start
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-white/40 text-xs mb-2">Waiting for host to start the game...</p>
                <button
                  onClick={async () => {
                    await useGameStore.getState().leaveRoom(user.id);
                    soundManager.playClick();
                  }}
                  className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                >
                  Leave Room
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Join Room */}
        <motion.button
          onClick={() => setShowJoinInput(!showJoinInput)}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all group"
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            🔗
          </div>
          <div className="text-left">
            <div className="text-white font-semibold">Join Room</div>
            <div className="text-white/40 text-xs">Enter a room code</div>
          </div>
        </motion.button>

        {showJoinInput && (
          <motion.div
            className="flex gap-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={6}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
            <button
              onClick={handleJoinRoom}
              disabled={joinCode.length < 4}
              className="px-6 py-3 rounded-xl bg-green-500 text-white font-medium text-sm disabled:opacity-30 hover:bg-green-600 transition-colors"
            >
              Join
            </button>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
