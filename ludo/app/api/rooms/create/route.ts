// ============================================================
// POST /api/rooms/create — Create a new room
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import RoomModel from '@/lib/models/room.model';
import { generateRoomCode } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { userId, nickname, slug } = await req.json();

    if (!userId || !nickname) {
      return NextResponse.json({ success: false, error: 'userId and nickname required' }, { status: 400 });
    }

    // Generate unique room code
    let code = generateRoomCode();
    let attempts = 0;
    while (await RoomModel.findById(code) && attempts < 10) {
      code = generateRoomCode();
      attempts++;
    }

    const room = new RoomModel({
      _id: code,
      hostId: userId,
      status: 'waiting',
      players: [
        {
          userId,
          nickname,
          slug: slug || '',
          color: 'red',
          isReady: true,
          isHost: true,
          isOnline: true,
          isBot: false,
        },
      ],
      maxPlayers: 4,
      createdAt: Date.now(),
    });

    await room.save();

    return NextResponse.json({ success: true, room: room.toJSON() });
  } catch (err: unknown) {
    console.error('Create room error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
