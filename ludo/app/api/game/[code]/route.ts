// ============================================================
// GET /api/game/[code] — Poll current game state
// POST /api/game/[code] — Game actions: roll, move, skip
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import RoomModel from '@/lib/models/room.model';
import {
  createPlayer,
  createGameState,
  rollDice,
  getMovablePieces,
  executeMove,
  handleSkipTurn,
  getBotMove,
} from '@/lib/game-engine';
import type { GameState, PlayerColor } from '@/lib/types';


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run any pending bot turns (up to 20 to avoid infinite loops) */
function runBotTurns(gs: GameState): GameState {
  let state = gs;
  let iterations = 0;
  while (iterations < 20 && state.phase === 'playing') {
    const cur = state.players[state.currentPlayerIndex];
    if (!cur.isBot) break;

    // Roll
    const value = rollDice();
    state = {
      ...state,
      dice: { ...state.dice, value, isRolling: false, canRoll: false },
    };

    const movable = getMovablePieces(cur, value, state.players);
    if (movable.length === 0) {
      state = handleSkipTurn(state);
    } else {
      const pieceId = getBotMove(cur, value, state.players) || movable[0].id;
      const result = executeMove(state, pieceId, value);
      state = result.gameState;
    }
    iterations++;
  }
  return state;
}

// ---------------------------------------------------------------------------
// GET — poll game state
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await connectDB();
    const { code } = await params;
    const room = await RoomModel.findById(code.toUpperCase());

    if (!room) {
      console.log(`[game GET] room not found: ${code}`);
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    }

    console.log(`[game GET] code=${code} status=${room.status} hasGameState=${!!room.gameState}`);

    return NextResponse.json({
      success: true,
      gameState: room.gameState ?? null,
      status: room.status,
      players: room.toJSON().players,
    });
  } catch (err: unknown) {
    console.error('Game GET error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — game actions
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await connectDB();
    const { code } = await params;
    const body = await req.json();
    const { action, userId, pieceId } = body;

    const room = await RoomModel.findById(code.toUpperCase());
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    }

    // ---- START: initialise game from room players ----
    if (action === 'start') {
      console.log(`[game POST start] code=${code} userId=${userId} hostId=${room.hostId} players=${room.players.length}`);
      if (room.hostId !== userId) {
        return NextResponse.json({ success: false, error: 'Only host can start' }, { status: 403 });
      }
      if (room.players.length < 2) {
        return NextResponse.json({ success: false, error: 'Need at least 2 players' }, { status: 400 });
      }

      const players = room.players.map((rp) =>
        createPlayer(
          crypto.randomUUID(),
          rp.nickname,
          rp.color as PlayerColor,
          rp.isBot ?? false,
          rp.isBot ? undefined : rp.userId,
          rp.isBot ? undefined : rp.slug,
        )
      );

      let gs = createGameState(players);
      // If first player is a bot, execute bot turns immediately
      gs = runBotTurns(gs);

      room.status = 'playing';
      room.gameState = gs as unknown as Record<string, unknown>;
      room.markModified('gameState');
      await room.save();
      console.log(`[game POST start] saved OK — status=${room.status} gsId=${gs.id}`);

      return NextResponse.json({ success: true, gameState: gs, status: room.status });
    }

    // All subsequent actions require an active game
    if (!room.gameState) {
      return NextResponse.json({ success: false, error: 'Game not started' }, { status: 400 });
    }

    let gs = room.gameState as unknown as GameState;

    // ---- ROLL ----
    if (action === 'roll') {
      const cur = gs.players[gs.currentPlayerIndex];
      console.log(`[game POST roll] code=${code} userId=${userId} curUserId=${cur.userId} canRoll=${gs.dice.canRoll}`);
      if (cur.userId !== userId) {
        console.log(`[game POST roll] REJECTED: not your turn (cur=${cur.userId} vs req=${userId})`);
        return NextResponse.json({ success: false, error: 'Not your turn' }, { status: 403 });
      }
      if (!gs.dice.canRoll || gs.dice.isRolling) {
        console.log(`[game POST roll] REJECTED: cannot roll (canRoll=${gs.dice.canRoll} isRolling=${gs.dice.isRolling})`);
        return NextResponse.json({ success: false, error: 'Cannot roll right now' }, { status: 400 });
      }

      const value = rollDice();
      gs = {
        ...gs,
        dice: { ...gs.dice, value, isRolling: false, canRoll: false },
      };

      const movable = getMovablePieces(cur, value, gs.players);

      if (movable.length === 0) {
        // No moves → skip
        gs = handleSkipTurn(gs);
        // Run bot turns if next player is bot
        gs = runBotTurns(gs);
      } else if (movable.length === 1) {
        // Auto-move single option
        const result = executeMove(gs, movable[0].id, value);
        gs = result.gameState;
        gs = runBotTurns(gs);
      }
      // else: >1 movable → client must call 'move' next

      room.gameState = gs as unknown as Record<string, unknown>;
      room.markModified('gameState');
      if (gs.phase === 'finished') room.status = 'finished';
      await room.save();

      return NextResponse.json({
        success: true,
        gameState: gs,
        diceValue: value,
        needsMove: movable.length > 1,
      });
    }

    // ---- MOVE ----
    if (action === 'move') {
      const cur = gs.players[gs.currentPlayerIndex];
      if (cur.userId !== userId) {
        return NextResponse.json({ success: false, error: 'Not your turn' }, { status: 403 });
      }
      if (!pieceId) {
        return NextResponse.json({ success: false, error: 'pieceId required' }, { status: 400 });
      }

      try {
        const result = executeMove(gs, pieceId, gs.dice.value);
        gs = result.gameState;
        gs = runBotTurns(gs);

        room.gameState = gs as unknown as Record<string, unknown>;
        room.markModified('gameState');
        if (gs.phase === 'finished') room.status = 'finished';
        await room.save();

        return NextResponse.json({
          success: true,
          gameState: gs,
          moveAction: result.action,
        });
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid move' }, { status: 400 });
      }
    }

    // ---- SKIP ----
    if (action === 'skip') {
      const cur = gs.players[gs.currentPlayerIndex];
      if (cur.userId !== userId) {
        return NextResponse.json({ success: false, error: 'Not your turn' }, { status: 403 });
      }
      gs = handleSkipTurn(gs);
      gs = runBotTurns(gs);

      room.gameState = gs as unknown as Record<string, unknown>;
      room.markModified('gameState');
      if (gs.phase === 'finished') room.status = 'finished';
      await room.save();

      return NextResponse.json({ success: true, gameState: gs });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Game POST error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
