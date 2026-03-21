// ============================================================
// GET /api/rooms/[code] — Get room info
// POST /api/rooms/[code] — Update room (add/remove bot, leave)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import RoomModel from '@/lib/models/room.model';
import { v4 as uuidv4 } from 'uuid';

const PLAYER_COLORS = ['red', 'green', 'yellow', 'blue'];
const DIAGONAL_MAP: Record<string, string> = { red: 'yellow', yellow: 'red', green: 'blue', blue: 'green' };
const BOT_NAMES = ['Bot Alpha', 'Bot Beta', 'Bot Gamma'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await connectDB();
    const { code } = await params;
    const room = await RoomModel.findById(code.toUpperCase());

    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, room: room.toJSON() });
  } catch (err: unknown) {
    console.error('Get room error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await connectDB();
    const { code } = await params;
    const { action, userId, botSlot } = await req.json();

    const room = await RoomModel.findById(code.toUpperCase());
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    }

    if (action === 'addBot') {
      if (room.players.length >= room.maxPlayers) {
        return NextResponse.json({ success: false, error: 'Room is full' }, { status: 400 });
      }

      const usedColors = room.players.map(p => p.color);
      let availableColor: string | undefined;
      // Diagonal preference for 2-player
      if (room.players.length === 1) {
        const hostColor = room.players[0].color;
        const diag = DIAGONAL_MAP[hostColor];
        if (diag && !usedColors.includes(diag)) {
          availableColor = diag;
        }
      }
      if (!availableColor) {
        availableColor = PLAYER_COLORS.find(c => !usedColors.includes(c));
      }
      if (!availableColor) {
        return NextResponse.json({ success: false, error: 'No colors available' }, { status: 400 });
      }

      const botCount = room.players.filter(p => p.isBot).length;
      room.players.push({
        userId: `bot-${uuidv4().slice(0, 8)}`,
        nickname: BOT_NAMES[botCount] || `Bot ${botCount + 1}`,
        slug: '',
        color: availableColor,
        isReady: true,
        isHost: false,
        isOnline: true,
        isBot: true,
      });

      await room.save();
      return NextResponse.json({ success: true, room: room.toJSON() });
    }

    if (action === 'removeBot') {
      const bots = room.players.filter(p => p.isBot);
      if (typeof botSlot === 'number' && bots[botSlot]) {
        const botUserId = bots[botSlot].userId;
        room.players = room.players.filter(p => p.userId !== botUserId);
        await room.save();
      }
      return NextResponse.json({ success: true, room: room.toJSON() });
    }

    if (action === 'leave') {
      room.players = room.players.filter(p => p.userId !== userId);
      if (room.players.length === 0) {
        await RoomModel.findByIdAndDelete(code.toUpperCase());
        return NextResponse.json({ success: true, room: null });
      }
      // Transfer host if needed
      if (room.hostId === userId) {
        const newHost = room.players.find(p => !p.isBot) || room.players[0];
        room.hostId = newHost.userId;
        newHost.isHost = true;
      }
      await room.save();
      return NextResponse.json({ success: true, room: room.toJSON() });
    }

    if (action === 'start') {
      if (room.hostId !== userId) {
        return NextResponse.json({ success: false, error: 'Only host can start' }, { status: 403 });
      }
      if (room.players.length < 2) {
        return NextResponse.json({ success: false, error: 'Need at least 2 players' }, { status: 400 });
      }
      room.status = 'playing';
      await room.save();
      return NextResponse.json({ success: true, room: room.toJSON() });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Room action error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
