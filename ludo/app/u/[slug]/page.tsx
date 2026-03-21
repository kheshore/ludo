'use client';

// ============================================================
// Public User Profile Page - View stats by slug
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store-auth';
import { useGameStore } from '@/lib/store-game';
import { User } from '@/lib/types';
import { getWinRate } from '@/lib/utils';

export default function UserProfilePage() {
  const {
    getUserBySlug,
    user: currentUser,
    sendFriendRequest,
    removeFriend,
    acceptFriendRequest,
    declineFriendRequest,
    refreshUser,
  } = useAuthStore();
  const { room } = useGameStore();
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const loadProfile = useCallback(async () => {
    if (slug) {
      const found = await getUserBySlug(slug);
      if (found) setProfileUser(found);
    }
  }, [slug, getUserBySlug]);

  useEffect(() => {
    let cancelled = false;
    if (slug) {
      // Refresh current user from DB to get latest friend requests
      refreshUser();
      getUserBySlug(slug).then(found => {
        if (!cancelled && found) setProfileUser(found);
      });
    }
    return () => { cancelled = true; };
  }, [slug, getUserBySlug, refreshUser]);

  if (!profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-white mb-2">User Not Found</h1>
          <p className="text-white/40 text-sm mb-6">No user with slug &quot;{slug}&quot;</p>
          <button
            onClick={() => router.push('/home')}
            className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/20 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const stats = profileUser.stats;
  const isOwnProfile = currentUser?.id === profileUser.id;
  const isFriend = currentUser?.friends?.includes(profileUser.id) ?? false;

  // Check if there's a pending friend request FROM the profile user TO current user
  const pendingFromThem = currentUser?.friendRequests?.find(
    r => r.fromUserId === profileUser.id && r.status === 'pending'
  );

  // Check if we already sent a request to them (profile user has our request pending)
  // We don't have their full friend request data from the API, so track via action message
  const hasRoom = room && room.status === 'waiting';

  const handleAddFriend = async () => {
    if (!currentUser || actionLoading) return;
    setActionLoading(true);
    setActionMsg('');
    const result = await sendFriendRequest(profileUser.slug);
    if (result.success) {
      setActionMsg('Friend request sent! ✉️');
      await refreshUser();
    } else {
      setActionMsg(result.error || 'Failed to send request');
    }
    setActionLoading(false);
  };

  const handleRemoveFriend = async () => {
    if (!currentUser || actionLoading) return;
    setActionLoading(true);
    await removeFriend(profileUser.id);
    setActionMsg('Friend removed');
    await refreshUser();
    setActionLoading(false);
    await loadProfile();
  };

  const handleAcceptRequest = async () => {
    if (!currentUser || actionLoading) return;
    setActionLoading(true);
    await acceptFriendRequest(profileUser.id);
    setActionMsg('Friend request accepted! 🎉');
    await refreshUser();
    setActionLoading(false);
    await loadProfile();
  };

  const handleDeclineRequest = async () => {
    if (!currentUser || actionLoading) return;
    setActionLoading(true);
    await declineFriendRequest(profileUser.id);
    setActionMsg('Request declined');
    await refreshUser();
    setActionLoading(false);
  };

  const handleCopyInvite = () => {
    if (!room) return;
    const link = `${window.location.origin}/join/${room.code}`;
    navigator.clipboard.writeText(link);
    setActionMsg('Room invite link copied! 📋');
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-950 via-gray-900 to-gray-950 pb-8">
      {/* Back */}
      <div className="px-4 pt-4">
        <button
          onClick={() => router.back()}
          className="text-white/50 hover:text-white text-sm"
        >
          ← Back
        </button>
      </div>

      {/* Profile Header */}
      <div className="px-4 pt-4 pb-6 text-center">
        <motion.div
          className="text-5xl mb-3"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
        >
          {profileUser.avatar}
        </motion.div>
        <h1 className="text-2xl font-bold text-white">{profileUser.nickname}</h1>
        <p className="text-white/40 text-sm mt-1">@{profileUser.slug}</p>
        {isOwnProfile && (
          <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-400">
            Your Profile
          </span>
        )}
      </div>

      {/* Social Actions (visible only for other users when logged in) */}
      {currentUser && !isOwnProfile && (
        <div className="px-4 mb-6">
          <div className="flex flex-col gap-2">
            {/* Pending request from them — show accept/decline */}
            {pendingFromThem ? (
              <div className="flex gap-2">
                <button
                  onClick={handleAcceptRequest}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-500/20 text-green-400 font-medium text-sm hover:bg-green-500/30 transition-colors disabled:opacity-50"
                >
                  <span>✓</span> Accept Request
                </button>
                <button
                  onClick={handleDeclineRequest}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  <span>✕</span> Decline
                </button>
              </div>
            ) : isFriend ? (
              /* Already friends — show remove + invite */
              <div className="flex gap-2">
                <button
                  onClick={handleRemoveFriend}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 font-medium text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <span>👋</span> Remove Friend
                </button>
                {hasRoom && (
                  <button
                    onClick={handleCopyInvite}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-500/20 text-purple-400 font-medium text-sm hover:bg-purple-500/30 transition-colors"
                  >
                    <span>🎮</span> Invite to Room
                  </button>
                )}
              </div>
            ) : (
              /* Not friends — show add friend */
              <button
                onClick={handleAddFriend}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500/20 text-blue-400 font-medium text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              >
                <span>➕</span> Add Friend
              </button>
            )}

            {/* Action feedback message */}
            {actionMsg && (
              <p className="text-center text-xs text-white/50 mt-1">{actionMsg}</p>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-6">
        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
          <div className="text-2xl font-bold text-white">{stats.gamesPlayed}</div>
          <div className="text-xs text-white/40">Played</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
          <div className="text-2xl font-bold text-green-400">{stats.gamesWon}</div>
          <div className="text-xs text-white/40">Won</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
          <div className="text-2xl font-bold text-amber-400">{getWinRate(stats.gamesWon, stats.gamesPlayed)}</div>
          <div className="text-xs text-white/40">Win Rate</div>
        </div>
      </div>

      {/* Placements */}
      <div className="px-4 mb-6">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
          Placements
        </h2>
        <div className="flex gap-3">
          {[
            { place: '1st', value: stats.firstPlaceFinishes, icon: '🥇' },
            { place: '2nd', value: stats.secondPlaceFinishes, icon: '🥈' },
            { place: '3rd', value: stats.thirdPlaceFinishes, icon: '🥉' },
            { place: '4th', value: stats.fourthPlaceFinishes, icon: '4️⃣' },
          ].map(p => (
            <div key={p.place} className="flex-1 bg-white/5 rounded-2xl p-3 text-center border border-white/5">
              <div className="text-lg">{p.icon}</div>
              <div className="text-lg font-bold text-white">{p.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="px-4">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
          Details
        </h2>
        <div className="space-y-2">
          {[
            { label: 'Best Win Streak', value: stats.bestWinStreak },
            { label: 'Total Captures', value: stats.totalCaptures },
            { label: 'Pieces Moved', value: stats.totalPiecesMoved },
            { label: 'Sixes Rolled', value: stats.totalSixes },
          ].map(item => (
            <div key={item.label} className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-sm text-white/60">{item.label}</span>
              <span className="text-sm font-bold text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
