// ============================================================
// POST /api/rooms/join — Join an existing room by code
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import RoomModel from '@/lib/models/room.model';

const PLAYER_COLORS = ['red', 'green', 'yellow', 'blue'];
// For 2-player games, prefer diagonal colors: red↔yellow, green↔blue
const DIAGONAL_MAP: Record<string, string> = { red: 'yellow', yellow: 'red', green: 'blue', blue: 'green' };

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { code, userId, nickname, slug } = await req.json();

    if (!code || !userId || !nickname) {
      return NextResponse.json({ success: false, error: 'code, userId and nickname required' }, { status: 400 });
    }

    const room = await RoomModel.findById(code.toUpperCase());

    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'waiting') {
      // Game already started — if they're already a player let them back in
      const existing = room.players.find(p => p.userId === userId);
      if (existing) {
        return NextResponse.json({ success: true, room: room.toJSON() });
      }
      return NextResponse.json({ success: false, error: 'Game already started' }, { status: 400 });
    }

    if (room.players.length >= room.maxPlayers) {
      return NextResponse.json({ success: false, error: 'Room is full' }, { status: 400 });
    }

    // Check if already in room
    if (room.players.find(p => p.userId === userId)) {
      return NextResponse.json({ success: true, room: room.toJSON() });
    }

    // Assign next available color (diagonal for 2-player: red↔yellow, green↔blue)
    const usedColors = room.players.map(p => p.color);
    let availableColor: string | undefined;

    // If this is the 2nd player, prefer the diagonal opponent of the host
    if (room.players.length === 1) {
      const hostColor = room.players[0].color;
      const diag = DIAGONAL_MAP[hostColor];
      if (diag && !usedColors.includes(diag)) {
        availableColor = diag;
      }
    }
    // Otherwise pick next available
    if (!availableColor) {
      availableColor = PLAYER_COLORS.find(c => !usedColors.includes(c));
    }
    if (!availableColor) {
      return NextResponse.json({ success: false, error: 'No colors available' }, { status: 400 });
    }

    room.players.push({
      userId,
      nickname,
      slug: slug || '',
      color: availableColor,
      isReady: false,
      isHost: false,
      isOnline: true,
      isBot: false,
    });

    await room.save();

    return NextResponse.json({ success: true, room: room.toJSON() });
  } catch (err: unknown) {
    console.error('Join room error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
