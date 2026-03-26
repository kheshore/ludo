'use client';

// ============================================================
// Friends Page - Friend list, requests, add friends, DM
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/store-auth';
import { useGameStore } from '@/lib/store-game';
import BottomNav from '@/components/nav/BottomNav';
import DirectMessageModal from '@/components/chat/DirectMessageModal';
import { soundManager } from '@/lib/sounds';
import { generateInviteLink } from '@/lib/utils';
import { User } from '@/lib/types';
import { useDMChat } from '@/lib/use-chat';
import { useChatStore, dmChannelId } from '@/lib/store-chat';

export default function FriendsPage() {
  const { user, getUserById, sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend, refreshUser } = useAuthStore();
  const { createRoom } = useGameStore();
  const router = useRouter();
  const [addSlug, setAddSlug] = useState('');
  const [addResult, setAddResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [dmTarget, setDmTarget] = useState<{ id: string; nickname: string } | null>(null);

  // Subscribe to DM channel when a DM target is selected
  useDMChat(user?.id, dmTarget?.id);

  // Subscribe to total unread count so badges re-render when messages arrive,
  // then read per-friend count imperatively (avoids unstable object selector).
  useChatStore((s) => Object.values(s.unreadCounts).reduce((a, b) => a + b, 0));
  const getUnreadCount = (friendId: string) =>
    useChatStore.getState().unreadCounts[dmChannelId(user?.id ?? '', friendId)] ?? 0;

  useEffect(() => {
    if (!user) router.replace('/');
  }, [user, router]);

  // Refresh user from DB on page load to get latest friend requests
  const refreshedRef = useRef(false);
  useEffect(() => {
    if (user && !refreshedRef.current) {
      refreshedRef.current = true;
      refreshUser();
    }
  }, [user, refreshUser]);

  // Load friends data asynchronously
  const loadFriends = useCallback(async () => {
    if (!user || user.friends.length === 0) {
      setFriends([]);
      setLoadingFriends(false);
      return;
    }
    setLoadingFriends(true);
    try {
      const results = await Promise.all(user.friends.map(id => getUserById(id)));
      setFriends(results.filter((f): f is User => f !== null));
    } catch {
      // Keep existing friends on error
    } finally {
      setLoadingFriends(false);
    }
  }, [user?.friends, getUserById]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  if (!user) {
    return <div className="min-h-screen bg-gray-950" />;
  }

  const pendingRequests = user.friendRequests.filter(r => r.status === 'pending');

  const handleAddFriend = async () => {
    if (!addSlug.trim()) return;
    const result = await sendFriendRequest(addSlug.trim());
    setAddResult(result.success
      ? { success: true, message: 'Request sent!' }
      : { success: false, message: result.error || 'Failed' }
    );
    soundManager.playClick();
    setAddSlug('');
    setTimeout(() => setAddResult(null), 3000);
  };

  const handleInviteToGame = async (friendId: string, friendNickname: string) => {
    soundManager.playNotification();
    // Create room on server
    const code = await createRoom(user.id, user.nickname, user.slug);
    const link = generateInviteLink(code);

    // Copy invite link so user can share it
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard may fail in some contexts
    }

    // Navigate to home page where the room panel will be visible
    // The user can add bots, invite more friends, and start when ready
    router.push(`/home?room=${code}&invited=${encodeURIComponent(friendNickname)}&friendId=${friendId}`);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-950 via-gray-900 to-gray-950 pb-24">
      <div className="px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-white">Friends</h1>
        <p className="text-white/40 text-sm mt-1">
          {friends.length} friend{friends.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Add Friend */}
      <div className="px-4 mb-6">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <span className="text-lg">➕</span>
          <span className="text-white text-sm font-medium">Add Friend by Slug</span>
        </button>

        <AnimatePresence>
          {showAdd && (
            <motion.div
              className="flex gap-2 mt-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <input
                type="text"
                value={addSlug}
                onChange={e => setAddSlug(e.target.value)}
                placeholder="Enter friend's slug"
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <button
                onClick={handleAddFriend}
                className="px-4 py-3 rounded-xl bg-blue-500 text-white text-sm font-medium"
              >
                Add
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {addResult && (
          <motion.p
            className={`text-xs mt-2 ${addResult.success ? 'text-green-400' : 'text-red-400'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {addResult.message}
          </motion.p>
        )}
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
            Pending Requests ({pendingRequests.length})
          </h2>
          <div className="space-y-2">
            {pendingRequests.map(req => (
              <motion.div
                key={req.fromUserId}
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-lg">
                  🤝
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{req.fromNickname}</div>
                  <div className="text-xs text-white/30">@{req.fromSlug}</div>
                </div>
                <button
                  onClick={async () => { await acceptFriendRequest(req.fromUserId); soundManager.playClick(); await loadFriends(); }}
                  className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium"
                >
                  Accept
                </button>
                <button
                  onClick={async () => { await declineFriendRequest(req.fromUserId); soundManager.playClick(); }}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium"
                >
                  Decline
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="px-4">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
          Your Friends
        </h2>
        {loadingFriends ? (
          <div className="text-center py-12">
            <div className="text-2xl mb-3 animate-spin">⏳</div>
            <p className="text-white/30 text-sm">Loading friends...</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3 opacity-50">👥</div>
            <p className="text-white/30 text-sm">No friends yet</p>
            <p className="text-white/20 text-xs mt-1">Add friends by their slug ID</p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => friend && (
              <motion.div
                key={friend.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">
                  {friend.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{friend.nickname}</div>
                  <div className="text-xs text-white/30">@{friend.slug}</div>
                </div>
                <button
                  onClick={() => handleInviteToGame(friend.id, friend.nickname)}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors"
                >
                  🎮 Invite
                </button>
                {/* DM button */}
                <button
                  onClick={() => { soundManager.playClick(); setDmTarget({ id: friend.id, nickname: friend.nickname }); }}
                  className="relative px-2 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-medium hover:bg-indigo-500/30 transition-colors"
                  title={`Message ${friend.nickname}`}
                >
                  💬
                  {(() => { const cnt = getUnreadCount(friend.id); return cnt > 0 ? (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-red-500 text-white font-bold" style={{ fontSize: 9, minWidth: 16, height: 16, padding: '0 3px' }}>
                      {cnt > 9 ? '9+' : cnt}
                    </span>
                  ) : null; })()}
                </button>
                <button
                  onClick={async () => { await removeFriend(friend.id); soundManager.playClick(); await loadFriends(); }}
                  className="px-2 py-1.5 rounded-lg bg-white/5 text-white/30 text-xs hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      {/* Direct Message Modal */}
      {user && dmTarget && (
        <DirectMessageModal
          isOpen={!!dmTarget}
          onClose={() => setDmTarget(null)}
          myUserId={user.id}
          targetUserId={dmTarget.id}
          targetNickname={dmTarget.nickname}
        />
      )}
    </div>
  );
}
