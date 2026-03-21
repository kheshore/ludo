'use client';

// ============================================================
// Profile Page - User profile, stats, game history
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store-auth';
import BottomNav from '@/components/nav/BottomNav';
import { getWinRate, generateProfileLink, formatTimeAgo, formatDuration } from '@/lib/utils';
import { soundManager } from '@/lib/sounds';
import { COLOR_CONFIG, type PlayerColor } from '@/lib/types';

interface GameHistoryEntry {
  id: string;
  roomCode: string;
  players: {
    userId: string;
    nickname: string;
    slug: string;
    color: string;
    isBot: boolean;
    finishOrder: number;
  }[];
  playerCount: number;
  startedAt: number;
  endedAt: number;
  duration: number;
}

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuthStore();
  const router = useRouter();
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState(user?.nickname || '');
  const [copied, setCopied] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!user) router.replace('/');
  }, [user, router]);

  // Load game history
  useEffect(() => {
    if (!user) return;
    fetch(`/api/game-history?userId=${user.id}&limit=20`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setGameHistory(data.games || []);
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoadingHistory(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) {
    return <div className="min-h-screen bg-gray-950" />;
  }

  const stats = user.stats;

  const handleSaveNickname = async () => {
    if (newNickname.trim().length >= 2) {
      await updateProfile({ nickname: newNickname.trim() });
      setEditingNickname(false);
      soundManager.playClick();
    }
  };

  const handleShareProfile = async () => {
    const link = generateProfileLink(user.slug);
    const text = `🎲 Check out my Ludo stats!\n${user.nickname} • ${stats.gamesWon} wins\n${link}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Ludo Profile', text, url: link });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = async () => {
    soundManager.playClick();
    await logout();
    router.replace('/');
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-950 via-gray-900 to-gray-950 pb-24">
      {/* Profile Header */}
      <div className="px-4 pt-8 pb-6 text-center">
        <motion.div
          className="text-5xl mb-3 inline-block"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {user.avatar}
        </motion.div>

        {editingNickname ? (
          <div className="flex items-center gap-2 justify-center mb-2">
            <input
              type="text"
              value={newNickname}
              onChange={e => setNewNickname(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-red-500/50 w-40"
              autoFocus
              maxLength={20}
            />
            <button
              onClick={handleSaveNickname}
              className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium"
            >
              ✓
            </button>
            <button
              onClick={() => { setEditingNickname(false); setNewNickname(user.nickname); }}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingNickname(true)}
            className="text-xl font-bold text-white hover:text-white/80 transition-colors mb-1 group"
          >
            {user.nickname}
            <span className="text-white/20 text-sm ml-2 group-hover:text-white/40">✏️</span>
          </button>
        )}

        <p className="text-white/40 text-sm">@{user.username} • {user.slug}</p>

        <div className="flex gap-2 justify-center mt-4">
          <button
            onClick={handleShareProfile}
            className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
          >
            {copied ? '✓ Copied!' : '📤 Share Profile'}
          </button>
        </div>
      </div>

      {/* Placements */}
      <div className="px-4 mb-6">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
          Placements
        </h2>
        <div className="flex gap-3">
          {[
            { place: '1st', value: stats.firstPlaceFinishes, color: 'text-amber-400', icon: '🥇' },
            { place: '2nd', value: stats.secondPlaceFinishes, color: 'text-gray-300', icon: '🥈' },
            { place: '3rd', value: stats.thirdPlaceFinishes, color: 'text-amber-600', icon: '🥉' },
            { place: '4th', value: stats.fourthPlaceFinishes, color: 'text-white/40', icon: '4️⃣' },
          ].map(p => (
            <div key={p.place} className="flex-1 bg-white/5 rounded-2xl p-3 text-center border border-white/5">
              <div className="text-lg">{p.icon}</div>
              <div className={`text-xl font-bold ${p.color}`}>{p.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid — simplified */}
      <div className="px-4 mb-6">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
          Statistics
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Games Played', value: stats.gamesPlayed, icon: '🎮' },
            { label: 'Win Rate', value: getWinRate(stats.gamesWon, stats.gamesPlayed), icon: '📊' },
            { label: 'Win Streak', value: stats.winStreak, icon: '🔥' },
            { label: 'Friends', value: user.friends.length, icon: '👥' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="bg-white/5 rounded-2xl p-4 border border-white/5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{stat.icon}</span>
                <span className="text-xs text-white/40">{stat.label}</span>
              </div>
              <div className="text-lg font-bold text-white">{stat.value}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Game History */}
      <div className="px-4 mb-6">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
          Game History
        </h2>

        {loadingHistory ? (
          <div className="text-center py-8">
            <div className="text-white/20 text-sm">Loading games...</div>
          </div>
        ) : gameHistory.length === 0 ? (
          <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/5">
            <div className="text-2xl mb-2">🎲</div>
            <div className="text-white/40 text-sm">No games played yet</div>
            <div className="text-white/20 text-xs mt-1">Play a game to see your history!</div>
          </div>
        ) : (
          <div className="space-y-2">
            {gameHistory.map((game) => {
              const myEntry = game.players.find(p => p.userId === user.id);
              const opponents = game.players.filter(p => p.userId !== user.id);
              const myPlace = myEntry?.finishOrder || 0;
              const isWin = myPlace === 1;
              const placeEmoji = myPlace === 1 ? '🥇' : myPlace === 2 ? '🥈' : myPlace === 3 ? '🥉' : '4️⃣';

              return (
                <motion.div
                  key={game.id}
                  className={`rounded-2xl p-3.5 border ${
                    isWin
                      ? 'bg-amber-500/5 border-amber-500/15'
                      : 'bg-white/5 border-white/5'
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="flex items-center gap-3">
                    {/* Place */}
                    <div className="text-xl">{placeEmoji}</div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-sm font-semibold ${isWin ? 'text-amber-400' : 'text-white'}`}>
                          {isWin ? 'Victory' : `${myPlace > 0 ? `#${myPlace}` : 'Played'}`}
                        </span>
                        <span className="text-white/20 text-xs">•</span>
                        <span className="text-white/30 text-xs">{game.playerCount}P</span>
                        {game.duration > 0 && (
                          <>
                            <span className="text-white/20 text-xs">•</span>
                            <span className="text-white/30 text-xs">{formatDuration(game.duration)}</span>
                          </>
                        )}
                      </div>

                      {/* Opponents */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-white/30 text-[10px]">vs</span>
                        {opponents.map((opp, idx) => (
                          <span key={idx} className="flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: COLOR_CONFIG[opp.color as PlayerColor]?.hex || '#888' }}
                            />
                            <span className="text-white/50 text-xs truncate max-w-20">
                              {opp.nickname}
                              {opp.isBot && ' 🤖'}
                            </span>
                            {idx < opponents.length - 1 && <span className="text-white/15 text-xs">,</span>}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Time */}
                    <div className="text-white/20 text-[10px] text-right shrink-0">
                      {formatTimeAgo(game.endedAt)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4">
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
        >
          Sign Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
