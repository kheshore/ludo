// ============================================================
// GET /api/game-history?userId=xxx — Get game history for a user
// POST /api/game-history — Record a completed game
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import GameHistoryModel from '@/lib/models/game-history.model';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10);

    const history = await GameHistoryModel.find({ 'players.userId': userId })
      .sort({ endedAt: -1 })
      .limit(limit)
      .lean();

    // Transform for client
    const games = history.map(g => ({
      id: g._id.toString(),
      roomCode: g.roomCode,
      players: g.players,
      playerCount: g.playerCount,
      startedAt: g.startedAt,
      endedAt: g.endedAt,
      duration: g.duration,
    }));

    return NextResponse.json({ success: true, games });
  } catch (err: unknown) {
    console.error('Game history GET error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { roomCode, players, playerCount, startedAt, endedAt, duration } = body;

    if (!players || !Array.isArray(players) || players.length < 2) {
      return NextResponse.json({ success: false, error: 'Invalid game data' }, { status: 400 });
    }

    const record = new GameHistoryModel({
      roomCode: roomCode || '',
      players,
      playerCount: playerCount || players.length,
      startedAt: startedAt || Date.now(),
      endedAt: endedAt || Date.now(),
      duration: duration || 0,
    });

    await record.save();

    return NextResponse.json({ success: true, id: record._id.toString() });
  } catch (err: unknown) {
    console.error('Game history POST error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
