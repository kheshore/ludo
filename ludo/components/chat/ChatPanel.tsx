'use client';

// ============================================================
// ChatPanel – Room-based group chat slide-up panel
// ============================================================

import { useState, useRef, useEffect, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/lib/store-chat';
import { sendRoomMessage } from '@/lib/use-chat';
import type { ChatMessage } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  myUserId: string;
  myNickname: string;
}

const EMOJI_QUICK = ['👍', '😂', '🔥', '😮', '😤', '🎲', '🏆', '💀'];

export default function ChatPanel({ isOpen, onClose, roomCode, myUserId, myNickname }: Props) {
  const rawMessages = useChatStore((s) => s.channels[roomCode]);
  const messages = useMemo(() => rawMessages ?? [], [rawMessages]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mark channel read when panel opens
  useEffect(() => {
    if (isOpen) useChatStore.getState().markRead(roomCode);
  }, [isOpen, roomCode]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = (msg: string) => {
    const trimmed = msg.trim();
    if (!trimmed) return;
    sendRoomMessage(roomCode, trimmed, myUserId, myNickname, '');
    setText('');
    setShowEmoji(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(text);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #12122a 0%, #0b0b1e 100%)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px 20px 0 0',
              height: '60dvh',
              maxHeight: 520,
              paddingBottom: 'env(safe-area-inset-bottom, 12px)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            {/* Handle + title */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2 }}>
              <div style={{ width: 36, height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.2)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 8px' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>💬 Room Chat</span>
              <button
                onClick={onClose}
                style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '4px 14px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {messages.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
                  Say something! 👋
                </p>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} isOwn={m.senderId === myUserId} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Quick emojis */}
            <AnimatePresence>
              {showEmoji && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  style={{
                    display: 'flex', gap: 6, padding: '6px 14px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {EMOJI_QUICK.map((e) => (
                    <button
                      key={e}
                      onClick={() => sendMessage(e)}
                      style={{
                        fontSize: 20, background: 'rgba(255,255,255,0.07)',
                        border: 'none', borderRadius: 8, padding: '4px 6px', cursor: 'pointer',
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <button
                type="button"
                onClick={() => setShowEmoji((v) => !v)}
                style={{
                  fontSize: 20, background: 'none', border: 'none', cursor: 'pointer',
                  opacity: showEmoji ? 1 : 0.5, transition: 'opacity 0.15s',
                }}
              >
                😊
              </button>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…"
                maxLength={500}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20,
                  color: '#fff',
                  fontSize: 14,
                  padding: '8px 14px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!text.trim()}
                style={{
                  background: text.trim() ? '#6366f1' : 'rgba(255,255,255,0.1)',
                  border: 'none', borderRadius: '50%', width: 38, height: 38,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: text.trim() ? 'pointer' : 'default',
                  transition: 'background 0.15s', flexShrink: 0,
                  fontSize: 16,
                }}
              >
                ➤
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Message bubble ────────────────────────────────────────────
function MessageBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
      {!isOwn && (
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2, marginLeft: 4 }}>
          {msg.senderNickname}
        </span>
      )}
      <div
        style={{
          maxWidth: '80%',
          background: isOwn ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.09)',
          borderRadius: isOwn ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          padding: '8px 12px',
          color: '#fff',
          fontSize: 14,
          lineHeight: 1.4,
          wordBreak: 'break-word',
        }}
      >
        {msg.text}
      </div>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2, marginLeft: 4, marginRight: 4 }}>
        {time}
      </span>
    </div>
  );
}
