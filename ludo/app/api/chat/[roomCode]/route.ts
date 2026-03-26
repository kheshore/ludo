// ============================================================
// Room chat API  — GET (SSE stream) + POST (send message)
// GET  /api/chat/[roomCode]          → SSE stream of ChatMessage
// POST /api/chat/[roomCode]          → body: { text, senderId, senderNickname, senderSlug }
// DELETE /api/chat/[roomCode]        → clear all messages (called on room dissolve)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import ChatMessageModel from '@/lib/models/chat-message.model';
import { randomUUID } from 'crypto';

// ── In-process SSE subscriber registry ───────────────────────
// Maps roomCode → Set of ReadableStream controllers
const roomSubscribers = new Map<string, Set<ReadableStreamDefaultController>>();

function broadcast(channelId: string, data: string) {
  const subs = roomSubscribers.get(channelId);
  if (!subs) return;
  for (const ctrl of subs) {
    try { ctrl.enqueue(`data: ${data}\n\n`); } catch { /* client gone */ }
  }
}

// ── GET – SSE stream ─────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  await connectDB();

  // Send last 50 messages on connect so the user sees history
  const history = await ChatMessageModel
    .find({ channelId: roomCode })
    .sort({ timestamp: 1 })
    .limit(50)
    .lean();

  const stream = new ReadableStream({
    start(controller) {
      // Seed history
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

      // Register for live pushes
      if (!roomSubscribers.has(roomCode)) roomSubscribers.set(roomCode, new Set());
      roomSubscribers.get(roomCode)!.add(controller);

      // Heartbeat every 25 s to keep connection alive through proxies
      const hb = setInterval(() => {
        try { controller.enqueue(': heartbeat\n\n'); } catch { clearInterval(hb); }
      }, 25_000);

      req.signal.addEventListener('abort', () => {
        clearInterval(hb);
        roomSubscribers.get(roomCode)?.delete(controller);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering
    },
  });
}

// ── POST – send message ───────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const { text, senderId, senderNickname, senderSlug } = await req.json();

  if (!text?.trim() || !senderId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  await connectDB();

  const msg = {
    _id: randomUUID(),
    channelId: roomCode,
    scope: 'room' as const,
    senderId,
    senderNickname: senderNickname ?? 'Anonymous',
    senderSlug: senderSlug ?? '',
    text: text.trim().slice(0, 500),
    timestamp: Date.now(),
    createdAt: new Date(),
  };

  await ChatMessageModel.create(msg);

  // Broadcast to all SSE subscribers in this room
  broadcast(roomCode, JSON.stringify({
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

// ── DELETE – clear room on dissolve ──────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  await connectDB();
  await ChatMessageModel.deleteMany({ channelId: roomCode });
  return NextResponse.json({ ok: true });
}
