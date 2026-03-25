// ============================================================
// Ludo Game Engine - Core Game Logic
// Deterministic, stateless, pure functions
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Player,
  Piece,
  PlayerColor,
  TurnRecord,
  TRACK_LENGTH,
  TOTAL_PATH_LENGTH,
  SAFE_POSITIONS,
  START_POSITIONS,
} from './types';

// --- Initialization ---

export function createPieces(color: PlayerColor): Piece[] {
  return Array.from({ length: 4 }, (_, i) => ({
    id: `${color}-${i}`,
    color,
    index: i,
    state: 'home' as const,
    trackPosition: -1,
  }));
}

export function createPlayer(
  id: string,
  nickname: string,
  color: PlayerColor,
  isBot = false,
  userId?: string,
  slug?: string
): Player {
  return {
    id,
    userId,
    slug,
    nickname,
    color,
    pieces: createPieces(color),
    isBot,
    isOnline: true,
    hasFinished: false,
    finishOrder: 0,
  };
}

export function createGameState(players: Player[]): GameState {
  return {
    id: uuidv4(),
    phase: 'playing',
    players,
    currentPlayerIndex: 0,
    dice: {
      value: 1,
      isRolling: false,
      rollCount: 0,
      canRoll: true,
    },
    winner: null,
    turnHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// --- Dice ---

let lastRollWasSix = false;

/**
 * Roll a dice 1-6. After rolling a 6, the next roll has a reduced
 * chance (~10%) of being another 6 to prevent frustrating chain-of-6s
 * that slow down the game.
 */
export function rollDice(): number {
  const array = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    array[0] = Math.floor(Math.random() * 4294967296);
  }

  let value: number;

  if (lastRollWasSix) {
    // After a 6, re-weight: ~18% each for 1-5, ~10% for 6
    // Use a 100-bucket approach for clarity
    const bucket = array[0] % 100;
    if (bucket < 90) {
      value = (bucket % 5) + 1; // 1-5 evenly (18% each)
    } else {
      value = 6; // 10% chance
    }
  } else {
    value = (array[0] % 6) + 1; // fair 1-6
  }

  lastRollWasSix = value === 6;
  return value;
}

// --- Path Calculation ---

/**
 * Convert a piece's track position to absolute board position
 * considering the player's color offset
 */
export function getAbsoluteTrackPosition(trackPos: number, color: PlayerColor): number {
  if (trackPos < 0) return -1; // home
  if (trackPos >= TRACK_LENGTH) return -2; // in home stretch or finished

  const startPos = START_POSITIONS[color];
  return (startPos + trackPos) % TRACK_LENGTH;
}

/**
 * Check if a position is in the home stretch for a given color
 */
export function isInHomeStretch(trackPos: number): boolean {
  return trackPos >= TRACK_LENGTH && trackPos < TOTAL_PATH_LENGTH;
}

/**
 * Get the board coordinates for a track position
 * This maps the logical track position to the 15x15 grid
 */
export function getGridPosition(trackPos: number, color: PlayerColor): { row: number; col: number } | null {
  if (trackPos < 0) return null; // home

  // Main track (0-51): shared path around the board
  if (trackPos < TRACK_LENGTH) {
    const absPos = getAbsoluteTrackPosition(trackPos, color);
    return MAIN_TRACK_COORDS[absPos];
  }

  // Home stretch (52-56): color-specific path to center
  const homeStretchIndex = trackPos - TRACK_LENGTH;
  if (homeStretchIndex >= 0 && homeStretchIndex < 6) {
    return HOME_STRETCH_COORDS[color][homeStretchIndex];
  }

  return null; // finished
}

// Main track coordinates (52 positions around the board on a 15x15 grid)
const MAIN_TRACK_COORDS: { row: number; col: number }[] = [
  // Red start area (left side, going up) - positions 0-4
  { row: 6, col: 1 },  // 0 - Red start (safe)
  { row: 6, col: 2 },  // 1
  { row: 6, col: 3 },  // 2
  { row: 6, col: 4 },  // 3
  { row: 6, col: 5 },  // 4

  // Turn up - positions 5-10
  { row: 5, col: 6 },  // 5
  { row: 4, col: 6 },  // 6
  { row: 3, col: 6 },  // 7
  { row: 2, col: 6 },  // 8 (safe)
  { row: 1, col: 6 },  // 9
  { row: 0, col: 6 },  // 10

  // Turn right - positions 11-12
  { row: 0, col: 7 },  // 11
  { row: 0, col: 8 },  // 12

  // Green start area (top side, going right) - positions 13-17
  { row: 1, col: 8 },  // 13 - Green start (safe)
  { row: 2, col: 8 },  // 14
  { row: 3, col: 8 },  // 15
  { row: 4, col: 8 },  // 16
  { row: 5, col: 8 },  // 17

  // Turn right - positions 18-23
  { row: 6, col: 9 },  // 18
  { row: 6, col: 10 }, // 19
  { row: 6, col: 11 }, // 20
  { row: 6, col: 12 }, // 21 (safe)
  { row: 6, col: 13 }, // 22
  { row: 6, col: 14 }, // 23

  // Turn down - positions 24-25
  { row: 7, col: 14 }, // 24
  { row: 8, col: 14 }, // 25

  // Yellow start area (right side, going down) - positions 26-30
  { row: 8, col: 13 }, // 26 - Yellow start (safe)
  { row: 8, col: 12 }, // 27
  { row: 8, col: 11 }, // 28
  { row: 8, col: 10 }, // 29
  { row: 8, col: 9 },  // 30

  // Turn down - positions 31-36
  { row: 9, col: 8 },  // 31
  { row: 10, col: 8 }, // 32
  { row: 11, col: 8 }, // 33
  { row: 12, col: 8 }, // 34 (safe)
  { row: 13, col: 8 }, // 35
  { row: 14, col: 8 }, // 36

  // Turn left - positions 37-38
  { row: 14, col: 7 }, // 37
  { row: 14, col: 6 }, // 38

  // Blue start area (bottom side, going left) - positions 39-43
  { row: 13, col: 6 }, // 39 - Blue start (safe)
  { row: 12, col: 6 }, // 40
  { row: 11, col: 6 }, // 41
  { row: 10, col: 6 }, // 42
  { row: 9, col: 6 },  // 43

  // Turn left - positions 44-49
  { row: 8, col: 5 },  // 44
  { row: 8, col: 4 },  // 45
  { row: 8, col: 3 },  // 46
  { row: 8, col: 2 },  // 47 (safe)
  { row: 8, col: 1 },  // 48
  { row: 8, col: 0 },  // 49

  // Turn up - positions 50-51
  { row: 7, col: 0 },  // 50
  { row: 6, col: 0 },  // 51 (loops back to 0 for red)
];

// Home stretch coordinates for each color (6 positions leading to center)
const HOME_STRETCH_COORDS: Record<PlayerColor, { row: number; col: number }[]> = {
  red: [
    { row: 7, col: 1 },
    { row: 7, col: 2 },
    { row: 7, col: 3 },
    { row: 7, col: 4 },
    { row: 7, col: 5 },
    { row: 7, col: 6 }, // center
  ],
  green: [
    { row: 1, col: 7 },
    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
    { row: 6, col: 7 }, // center
  ],
  yellow: [
    { row: 7, col: 13 },
    { row: 7, col: 12 },
    { row: 7, col: 11 },
    { row: 7, col: 10 },
    { row: 7, col: 9 },
    { row: 7, col: 8 }, // center
  ],
  blue: [
    { row: 13, col: 7 },
    { row: 12, col: 7 },
    { row: 11, col: 7 },
    { row: 10, col: 7 },
    { row: 9, col: 7 },
    { row: 8, col: 7 }, // center
  ],
};

// Home base coordinates (where pieces sit before entering play)
export const HOME_BASE_COORDS: Record<PlayerColor, { row: number; col: number }[]> = {
  red: [
    { row: 1, col: 1 },
    { row: 1, col: 4 },
    { row: 4, col: 1 },
    { row: 4, col: 4 },
  ],
  green: [
    { row: 1, col: 10 },
    { row: 1, col: 13 },
    { row: 4, col: 10 },
    { row: 4, col: 13 },
  ],
  yellow: [
    { row: 10, col: 10 },
    { row: 10, col: 13 },
    { row: 13, col: 10 },
    { row: 13, col: 13 },
  ],
  blue: [
    { row: 10, col: 1 },
    { row: 10, col: 4 },
    { row: 13, col: 1 },
    { row: 13, col: 4 },
  ],
};

// --- Move Validation ---

export function canPieceMove(piece: Piece, diceValue: number, player: Player, _allPlayers: Player[]): boolean {
  // Piece is already finished
  if (piece.state === 'finished') return false;

  // Piece is at home - needs a 6 to enter
  if (piece.state === 'home') {
    return diceValue === 6;
  }

  // Piece is active - check if it can move forward
  const newPos = piece.trackPosition + diceValue;

  // Can't go past the finish
  if (newPos > TOTAL_PATH_LENGTH - 1) return false;

  // Check if landing on own piece
  const landingOnOwnPiece = player.pieces.some(
    p => p.id !== piece.id && p.state === 'active' && p.trackPosition === newPos
  );
  if (landingOnOwnPiece) return false;

  return true;
}

export function getMovablePieces(player: Player, diceValue: number, allPlayers: Player[]): Piece[] {
  return player.pieces.filter(piece => canPieceMove(piece, diceValue, player, allPlayers));
}

// --- Move Execution ---

export interface MoveResult {
  gameState: GameState;
  capturedPiece: Piece | null;
  action: TurnRecord['action'];
  entered: boolean;
  finished: boolean;
}

export function executeMove(
  state: GameState,
  pieceId: string,
  diceValue: number
): MoveResult {
  // Deep clone state
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const playerIndex = newState.currentPlayerIndex;
  const player = newState.players[playerIndex];
  const piece = player.pieces.find(p => p.id === pieceId);

  if (!piece) {
    throw new Error(`Piece ${pieceId} not found`);
  }

  let capturedPiece: Piece | null = null;
  let action: TurnRecord['action'] = 'move';
  let entered = false;
  let finished = false;

  if (piece.state === 'home' && diceValue === 6) {
    // Enter the board
    piece.state = 'active';
    piece.trackPosition = 0;
    action = 'enter';
    entered = true;

    // Check for capture at start position
    const startAbsPos = START_POSITIONS[player.color];
    capturedPiece = checkAndExecuteCapture(newState, player, startAbsPos, piece);
    if (capturedPiece) action = 'capture';
  } else if (piece.state === 'active') {
    piece.trackPosition += diceValue;

    // Check if piece reached finish
    if (piece.trackPosition >= TOTAL_PATH_LENGTH - 1) {
      piece.trackPosition = TOTAL_PATH_LENGTH - 1;
      piece.state = 'finished';
      action = 'finish';
      finished = true;

      // Check if player has finished all pieces
      if (player.pieces.every(p => p.state === 'finished')) {
        player.hasFinished = true;
        const finishedCount = newState.players.filter(p => p.hasFinished).length;
        player.finishOrder = finishedCount;

        // Check if game is over (3 out of 4 finished, or all finished)
        const activePlayers = newState.players.filter(p => !p.isBot || true); // count all
        const allFinished = activePlayers.filter(p => p.hasFinished).length >= activePlayers.length - 1;
        if (allFinished) {
          newState.phase = 'finished';
          // Assign last place to remaining player
          const lastPlayer = newState.players.find(p => !p.hasFinished);
          if (lastPlayer) {
            lastPlayer.finishOrder = newState.players.length;
            lastPlayer.hasFinished = true;
          }
          newState.winner = newState.players.find(p => p.finishOrder === 1)?.id || null;
        }
      }
    } else if (!isInHomeStretch(piece.trackPosition)) {
      // Check for capture on main track
      const absPos = getAbsoluteTrackPosition(piece.trackPosition, player.color);
      capturedPiece = checkAndExecuteCapture(newState, player, absPos, piece);
      if (capturedPiece) action = 'capture';
    }
  }

  // Record turn
  const record: TurnRecord = {
    playerId: player.id,
    diceValue,
    pieceId,
    action,
    timestamp: Date.now(),
  };
  newState.turnHistory.push(record);

  // Determine next turn
  const extraTurn = diceValue === 6 || capturedPiece !== null;
  if (!extraTurn || player.hasFinished) {
    advanceTurn(newState);
  } else {
    // Player gets another turn
    newState.dice.rollCount = diceValue === 6 ? newState.dice.rollCount + 1 : 0;

    // Three consecutive 6s: penalize (skip turn)
    if (newState.dice.rollCount >= 3) {
      newState.dice.rollCount = 0;
      advanceTurn(newState);
    }
  }

  newState.dice.canRoll = true;
  newState.dice.isRolling = false;
  newState.updatedAt = Date.now();

  return { gameState: newState, capturedPiece, action, entered, finished };
}

function checkAndExecuteCapture(
  state: GameState,
  currentPlayer: Player,
  absolutePosition: number,
  _movingPiece: Piece
): Piece | null {
  // Check if position is safe
  if (SAFE_POSITIONS.includes(absolutePosition)) return null;

  // Find opponent piece at this position
  for (const opponent of state.players) {
    if (opponent.id === currentPlayer.id) continue;

    for (const oppPiece of opponent.pieces) {
      if (oppPiece.state !== 'active') continue;

      const oppAbsPos = getAbsoluteTrackPosition(oppPiece.trackPosition, opponent.color);
      if (oppAbsPos === absolutePosition) {
        // Capture! Send piece back home
        oppPiece.state = 'home';
        oppPiece.trackPosition = -1;
        return JSON.parse(JSON.stringify(oppPiece));
      }
    }
  }

  return null;
}

function advanceTurn(state: GameState): void {
  if (state.phase === 'finished') return;

  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  let attempts = 0;

  // Skip finished players
  while (state.players[nextIndex].hasFinished && attempts < state.players.length) {
    nextIndex = (nextIndex + 1) % state.players.length;
    attempts++;
  }

  state.currentPlayerIndex = nextIndex;
  state.dice.rollCount = 0;
  state.dice.canRoll = true;
}

export function handleSkipTurn(state: GameState): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const player = newState.players[newState.currentPlayerIndex];

  const record: TurnRecord = {
    playerId: player.id,
    diceValue: newState.dice.value,
    pieceId: null,
    action: 'skip',
    timestamp: Date.now(),
  };
  newState.turnHistory.push(record);

  advanceTurn(newState);
  newState.dice.canRoll = true;
  newState.updatedAt = Date.now();

  return newState;
}

// --- Bot AI ---

export function getBotMove(player: Player, diceValue: number, allPlayers: Player[]): string | null {
  const movable = getMovablePieces(player, diceValue, allPlayers);
  if (movable.length === 0) return null;

  // Priority: capture > enter > advance furthest > advance closest to home
  // Simple but effective AI

  // 1. Try to capture
  for (const piece of movable) {
    const newPos = piece.state === 'home' ? 0 : piece.trackPosition + diceValue;
    if (newPos < TRACK_LENGTH) {
      const absPos = piece.state === 'home'
        ? START_POSITIONS[player.color]
        : getAbsoluteTrackPosition(newPos, player.color);

      for (const opp of allPlayers) {
        if (opp.id === player.id) continue;
        for (const oppPiece of opp.pieces) {
          if (oppPiece.state !== 'active') continue;
          const oppAbsPos = getAbsoluteTrackPosition(oppPiece.trackPosition, opp.color);
          if (oppAbsPos === absPos && !SAFE_POSITIONS.includes(absPos)) {
            return piece.id;
          }
        }
      }
    }
  }

  // 2. If dice is 6 and has pieces at home, enter
  if (diceValue === 6) {
    const homePiece = movable.find(p => p.state === 'home');
    if (homePiece) return homePiece.id;
  }

  // 3. Move piece closest to finishing
  const sorted = [...movable].sort((a, b) => b.trackPosition - a.trackPosition);
  return sorted[0].id;
}

// --- Step-by-step movement path ---

/**
 * Returns an ordered array of intermediate track positions a piece passes
 * through when moving `diceValue` steps.  Each entry has the trackPosition
 * and the corresponding piece state so the board can render it correctly.
 *
 * For a piece leaving home (diceValue === 6) the path starts at position 0
 * (the start cell) and stays there (just 1 step).
 *
 * For an active piece the path is every integer position from
 * (current + 1) up to (current + diceValue).
 */
export interface MovementStep {
  trackPosition: number;
  state: 'active' | 'finished';
}

export function getMovementPath(piece: Piece, diceValue: number): MovementStep[] {
  const steps: MovementStep[] = [];

  if (piece.state === 'home' && diceValue === 6) {
    // Entering the board — single step to position 0
    steps.push({ trackPosition: 0, state: 'active' });
    return steps;
  }

  if (piece.state !== 'active') return steps;

  const start = piece.trackPosition;
  for (let i = 1; i <= diceValue; i++) {
    const pos = start + i;
    const capped = Math.min(pos, TOTAL_PATH_LENGTH - 1);
    steps.push({
      trackPosition: capped,
      state: capped >= TOTAL_PATH_LENGTH - 1 ? 'finished' : 'active',
    });
    if (capped >= TOTAL_PATH_LENGTH - 1) break;
  }

  return steps;
}

// --- Utility ---

export { MAIN_TRACK_COORDS, HOME_STRETCH_COORDS };
