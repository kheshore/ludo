// ============================================================
// useRoomChat  – subscribe to room group chat via SSE
// useDMChat    – subscribe to a 1:1 DM channel via SSE
// sendRoomMessage / sendDMMessage – POST helpers
// ============================================================

'use client';

import { useEffect, useRef } from 'react';
import { useChatStore, dmChannelId } from './store-chat';

// ── Helpers ───────────────────────────────────────────────────

function parseSseLine(line: string) {
  if (!line.startsWith('data: ')) return null;
  try { return JSON.parse(line.slice(6)); } catch { return null; }
}

// ── Room chat ─────────────────────────────────────────────────

export function useRoomChat(roomCode: string | undefined) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    // Close any existing connection for this room
    esRef.current?.close();

    const es = new EventSource(`/api/chat/${roomCode}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        useChatStore.getState().receiveMessage(msg);
      } catch { /* malformed */ }
    };

    es.onerror = () => {
      // Browser auto-reconnects EventSource; nothing to do here
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [roomCode]);
}

// ── DM chat ───────────────────────────────────────────────────

export function useDMChat(myUserId: string | undefined, withUserId: string | undefined) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!myUserId || !withUserId) return;

    const channelId = dmChannelId(myUserId, withUserId);
    esRef.current?.close();

    const es = new EventSource(`/api/chat/dm/${channelId}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        useChatStore.getState().receiveMessage(msg);
      } catch { /* malformed */ }
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [myUserId, withUserId]);
}

// ── Send helpers (called from components) ────────────────────

export async function sendRoomMessage(
  roomCode: string,
  text: string,
  senderId: string,
  senderNickname: string,
  senderSlug: string,
) {
  await fetch(`/api/chat/${roomCode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, senderId, senderNickname, senderSlug }),
  });
}

export async function sendDMMessage(
  myUserId: string,
  withUserId: string,
  text: string,
  senderNickname: string,
  senderSlug: string,
) {
  const channelId = dmChannelId(myUserId, withUserId);
  await fetch(`/api/chat/dm/${channelId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, senderId: myUserId, senderNickname, senderSlug }),
  });
}

export { dmChannelId };
export { parseSseLine }; // exported for tests
