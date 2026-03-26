'use client';

// ============================================================
// DirectMessageModal – 1-on-1 in-game DM overlay
// ============================================================

import { useState, useRef, useEffect, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, dmChannelId } from '@/lib/store-chat';
import { sendDMMessage } from '@/lib/use-chat';
import type { ChatMessage } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  myUserId: string;
  targetUserId: string;
  targetNickname: string;
}

const EMOJI_QUICK = ['👍', '😂', '🔥', '😮', '😤', '🎲', '🏆', '💀'];

export default function DirectMessageModal({ isOpen, onClose, myUserId, targetUserId, targetNickname }: Props) {
  const channelId = dmChannelId(myUserId, targetUserId);
  const rawMessages = useChatStore((s) => s.channels[channelId]);
  const messages = useMemo(() => rawMessages ?? [], [rawMessages]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) useChatStore.getState().markRead(channelId);
  }, [isOpen, channelId]);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = (msg: string) => {
    const trimmed = msg.trim();
    if (!trimmed) return;
    sendDMMessage(myUserId, targetUserId, trimmed, targetNickname, '');
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
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-4 z-60 flex flex-col"
            style={{
              bottom: 'env(safe-area-inset-bottom, 24px)',
              top: 80,
              background: 'linear-gradient(180deg, #12122a 0%, #0b0b1e 100%)',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: '#fff',
                }}>
                  {targetNickname.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1 }}>
                    {targetNickname}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>
                    Direct Message
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {messages.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
                  Start a conversation 🤝
                </p>
              )}
              {messages.map((m) => (
                <DMBubble key={m.id} msg={m} isOwn={m.senderId === myUserId} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Quick emoji */}
            <AnimatePresence>
              {showEmoji && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  style={{
                    display: 'flex', gap: 6, padding: '6px 14px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    flexShrink: 0,
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
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setShowEmoji((v) => !v)}
                style={{
                  fontSize: 20, background: 'none', border: 'none', cursor: 'pointer',
                  opacity: showEmoji ? 1 : 0.5,
                }}
              >
                😊
              </button>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Message ${targetNickname}…`}
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
                  transition: 'background 0.15s', flexShrink: 0, fontSize: 16,
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

function DMBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '82%',
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
