// ============================================================
// DM chat API  — GET (SSE) + POST (send)
// channelId = sorted "uid1:uid2"
// GET  /api/chat/dm/[channelId]
// POST /api/chat/dm/[channelId]   body: { text, senderId, senderNickname, senderSlug }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import ChatMessageModel from '@/lib/models/chat-message.model';
import { randomUUID } from 'crypto';

// ── In-process SSE subscriber registry ───────────────────────
const dmSubscribers = new Map<string, Set<ReadableStreamDefaultController>>();

function broadcast(channelId: string, data: string) {
  const subs = dmSubscribers.get(channelId);
  if (!subs) return;
  for (const ctrl of subs) {
    try { ctrl.enqueue(`data: ${data}\n\n`); } catch { /* client gone */ }
  }
}

// ── GET – SSE stream ─────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  await connectDB();

  const history = await ChatMessageModel
    .find({ channelId })
    .sort({ timestamp: 1 })
    .limit(100)
    .lean();

  const stream = new ReadableStream({
    start(controller) {
      for (const msg of history) {
        const payload = JSON.stringify({
          id: msg._id,
          channelId: msg.channelId,
          scope: msg.scope,
          senderId: msg.senderId,
          senderNickname: msg.senderNickname,
          senderSlug: msg.senderSlug,
          text: msg.text,
          timestamp: msg.timestamp,
        });
        controller.enqueue(`data: ${payload}\n\n`);
      }

      if (!dmSubscribers.has(channelId)) dmSubscribers.set(channelId, new Set());
      dmSubscribers.get(channelId)!.add(controller);

      const hb = setInterval(() => {
        try { controller.enqueue(': heartbeat\n\n'); } catch { clearInterval(hb); }
      }, 25_000);

      req.signal.addEventListener('abort', () => {
        clearInterval(hb);
        dmSubscribers.get(channelId)?.delete(controller);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ── POST – send message ───────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const { text, senderId, senderNickname, senderSlug } = await req.json();

  if (!text?.trim() || !senderId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  await connectDB();

  const msg = {
    _id: randomUUID(),
    channelId,
    scope: 'dm' as const,
    senderId,
    senderNickname: senderNickname ?? 'Anonymous',
    senderSlug: senderSlug ?? '',
    text: text.trim().slice(0, 500),
    timestamp: Date.now(),
    createdAt: new Date(),
  };

  await ChatMessageModel.create(msg);

  broadcast(channelId, JSON.stringify({
    id: msg._id,
    channelId: msg.channelId,
    scope: msg.scope,
    senderId: msg.senderId,
    senderNickname: msg.senderNickname,
    senderSlug: msg.senderSlug,
    text: msg.text,
    timestamp: msg.timestamp,
  }));

  return NextResponse.json({ ok: true });
}
