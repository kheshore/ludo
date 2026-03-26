// ============================================================
// Chat Store – in-memory only (no persistence, cleared on room dissolve)
// Handles both room group-chat and 1-on-1 DMs
// ============================================================

import { create } from 'zustand';
import { ChatMessage } from './types';

interface ChatStore {
  // Messages keyed by channelId (roomCode or "uid1:uid2")
  channels: Record<string, ChatMessage[]>;
  // Unread counts per channel
  unreadCounts: Record<string, number>;
  // Active DM channels the current user is watching
  openDMChannels: Set<string>;

  // Actions
  receiveMessage: (msg: ChatMessage) => void;
  markRead: (channelId: string) => void;
  clearChannel: (channelId: string) => void;
  openDM: (channelId: string) => void;
  closeDM: (channelId: string) => void;
  clearAllRooms: () => void;
}

/** Build a deterministic DM channel id from two user-ids */
export function dmChannelId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join(':');
}

export const useChatStore = create<ChatStore>()((set) => ({
  channels: {},
  unreadCounts: {},
  openDMChannels: new Set(),

  receiveMessage: (msg) => {
    set((state) => {
      const msgs = state.channels[msg.channelId] ?? [];
      const unread = state.unreadCounts[msg.channelId] ?? 0;
      return {
        channels: { ...state.channels, [msg.channelId]: [...msgs, msg] },
        unreadCounts: { ...state.unreadCounts, [msg.channelId]: unread + 1 },
      };
    });
  },

  markRead: (channelId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [channelId]: 0 },
    })),

  clearChannel: (channelId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [channelId]: _msgs, ...restMsgs } = state.channels;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [channelId]: _cnt, ...restCounts } = state.unreadCounts;
      return { channels: restMsgs, unreadCounts: restCounts };
    }),

  openDM: (channelId) =>
    set((state) => {
      const next = new Set(state.openDMChannels);
      next.add(channelId);
      return { openDMChannels: next };
    }),

  closeDM: (channelId) =>
    set((state) => {
      const next = new Set(state.openDMChannels);
      next.delete(channelId);
      return { openDMChannels: next };
    }),

  clearAllRooms: () =>
    set((state) => {
      // keep only DM channels, wipe room channels
      const filteredMsgs: Record<string, ChatMessage[]> = {};
      const filteredCounts: Record<string, number> = {};
      for (const ch of Object.keys(state.channels)) {
        if (ch.includes(':')) {
          // DM channel – keep
          filteredMsgs[ch] = state.channels[ch];
          filteredCounts[ch] = state.unreadCounts[ch] ?? 0;
        }
      }
      return { channels: filteredMsgs, unreadCounts: filteredCounts };
    }),
}));
