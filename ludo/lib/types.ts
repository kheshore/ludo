// ============================================================
// Ludo Game - Core Type Definitions
// ============================================================

// --- Color & Player Types ---
export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export const PLAYER_COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export const COLOR_CONFIG: Record<PlayerColor, { hex: string; light: string; dark: string; glow: string; name: string }> = {
  red: { hex: '#EF4444', light: '#FCA5A5', dark: '#B91C1C', glow: 'rgba(239,68,68,0.5)', name: 'Red' },
  green: { hex: '#22C55E', light: '#86EFAC', dark: '#15803D', glow: 'rgba(34,197,94,0.5)', name: 'Green' },
  yellow: { hex: '#EAB308', light: '#FDE047', dark: '#A16207', glow: 'rgba(234,179,8,0.5)', name: 'Yellow' },
  blue: { hex: '#3B82F6', light: '#93C5FD', dark: '#1D4ED8', glow: 'rgba(59,130,246,0.5)', name: 'Blue' },
};

// --- Piece & Position ---
export interface Position {
  row: number;
  col: number;
}

export type PieceState = 'home' | 'active' | 'finished';

export interface Piece {
  id: string; // e.g. "red-0"
  color: PlayerColor;
  index: number; // 0-3
  state: PieceState;
  trackPosition: number; // -1 = home, 0-55 = on track, 56 = finished
}

// --- Player ---
export interface Player {
  id: string;
  userId?: string;
  slug?: string;
  nickname: string;
  color: PlayerColor;
  pieces: Piece[];
  isBot: boolean;
  isOnline: boolean;
  hasFinished: boolean;
  finishOrder: number; // 0 = not finished, 1 = first, etc.
}

// --- Dice ---
export interface DiceState {
  value: number; // 1-6
  isRolling: boolean;
  rollCount: number; // consecutive 6s count
  canRoll: boolean;
}

// --- Game State ---
export type GamePhase = 'waiting' | 'playing' | 'finished';

export interface GameState {
  id: string;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  dice: DiceState;
  winner: string | null; // player id
  turnHistory: TurnRecord[];
  createdAt: number;
  updatedAt: number;
}

export interface TurnRecord {
  playerId: string;
  diceValue: number;
  pieceId: string | null;
  action: 'move' | 'capture' | 'enter' | 'finish' | 'skip';
  timestamp: number;
}

// --- Room ---
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface Room {
  id: string;
  code: string; // 6-char invite code
  hostId: string;
  status: RoomStatus;
  players: RoomPlayer[];
  maxPlayers: number;
  gameId?: string;
  createdAt: number;
  settings: RoomSettings;
}

export interface RoomPlayer {
  userId: string;
  nickname: string;
  slug: string;
  color: PlayerColor;
  isReady: boolean;
  isHost: boolean;
  isOnline: boolean;
  isBot?: boolean;
}

export interface RoomSettings {
  allowBots: boolean;
  autoStart: boolean;
  turnTimeLimit: number; // seconds, 0 = no limit
}

// --- User / Auth ---
export interface User {
  id: string;
  slug: string; // unique URL-friendly identifier
  username: string;
  nickname: string;
  passwordHash: string;
  avatar: string; // emoji or color code
  stats: UserStats;
  friends: string[]; // user ids
  friendRequests: FriendRequest[];
  createdAt: number;
  lastSeen: number;
  isOnline: boolean;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalPiecesMoved: number;
  totalCaptures: number;
  totalSixes: number;
  winStreak: number;
  bestWinStreak: number;
  averageGameDuration: number; // in seconds
  firstPlaceFinishes: number;
  secondPlaceFinishes: number;
  thirdPlaceFinishes: number;
  fourthPlaceFinishes: number;
}

export interface FriendRequest {
  fromUserId: string;
  fromNickname: string;
  fromSlug: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined';
}

// --- Socket Events ---
export interface ServerToClientEvents {
  'room:updated': (room: Room) => void;
  'room:player-joined': (player: RoomPlayer) => void;
  'room:player-left': (userId: string) => void;
  'game:state-updated': (state: GameState) => void;
  'game:dice-rolled': (data: { playerId: string; value: number }) => void;
  'game:piece-moved': (data: { pieceId: string; from: number; to: number }) => void;
  'game:piece-captured': (data: { capturedPieceId: string; byPieceId: string }) => void;
  'game:turn-changed': (data: { playerId: string }) => void;
  'game:finished': (data: { winnerId: string; rankings: string[] }) => void;
  'friend:request': (request: FriendRequest) => void;
  'friend:online': (userId: string) => void;
  'friend:offline': (userId: string) => void;
  'ping:game-invite': (data: { fromNickname: string; roomCode: string }) => void;
  'notification': (data: { type: string; message: string }) => void;
}

export interface ClientToServerEvents {
  'room:create': (settings: RoomSettings) => void;
  'room:join': (code: string) => void;
  'room:leave': () => void;
  'room:ready': () => void;
  'room:start': () => void;
  'room:kick': (userId: string) => void;
  'game:roll-dice': () => void;
  'game:move-piece': (pieceId: string) => void;
  'game:skip-turn': () => void;
  'friend:send-request': (targetSlug: string) => void;
  'friend:accept': (fromUserId: string) => void;
  'friend:decline': (fromUserId: string) => void;
  'friend:remove': (userId: string) => void;
  'ping:invite': (data: { targetUserId: string; roomCode: string }) => void;
}

// --- Board Constants ---
export const BOARD_SIZE = 15;
export const TRACK_LENGTH = 52; // main track squares
export const HOME_STRETCH_LENGTH = 5; // final 5 squares before finish
export const TOTAL_PATH_LENGTH = 57; // 52 + 5 home stretch

export const SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47]; // star positions

// Starting positions on track for each color
export const START_POSITIONS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// Home stretch entry positions (the square before entering home stretch)
export const HOME_ENTRY: Record<PlayerColor, number> = {
  red: 50,
  green: 11,
  yellow: 24,
  blue: 37,
};
