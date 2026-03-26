// ============================================================
// Game Store - Game state management
// ============================================================

import { create } from 'zustand';
import {
  GameState,
  Player,
  PlayerColor,
  Room,
} from './types';
import {
  createPlayer,
  createGameState,
  rollDice,
  getMovablePieces,
  executeMove,
  handleSkipTurn,
  getBotMove,
  getMovementPath,
} from './game-engine';
import { soundManager } from './sounds';


interface GameStore {
  // Room state
  room: Room | null;
  
  // Game state
  gameState: GameState | null;
  selectedPieceId: string | null;
  animatingPieceId: string | null;
  /** Non-null while a piece is mid-step-animation; holds the intermediate trackPosition */
  stepAnimationPos: { pieceId: string; trackPosition: number; color: import('./types').PlayerColor } | null;
  lastCapturedPieceId: string | null;
  showDiceResult: boolean;

  // Actions - Room (async — server-backed)
  createRoom: (hostId: string, hostNickname: string, hostSlug: string) => Promise<string>;
  joinRoom: (code: string, userId: string, nickname: string, slug: string) => Promise<{ success: boolean; error?: string }>;
  refreshRoom: (code: string) => Promise<void>;
  leaveRoom: (userId: string) => Promise<void>;
  setReady: (userId: string) => void;
  startGame: (userId: string) => Promise<void>;

  // Actions - Room bots (async — server-backed)
  addBotToRoom: () => Promise<void>;
  removeBotFromRoom: (botSlot: number) => Promise<void>;

  // Actions - Game (server for multiplayer, local for quick play)
  rollGameDice: (userId?: string) => void;
  selectPiece: (pieceId: string | null) => void;
  movePiece: (pieceId: string, userId?: string) => void;
  skipTurn: (userId?: string) => void;
  
  // Multiplayer polling
  pollGameState: (code: string) => Promise<void>;

  // Bot (local quick-play only)
  executeBotTurn: () => void;

  // Utility
  getCurrentPlayer: () => Player | null;
  isCurrentPlayerTurn: (userId: string) => boolean;
  resetGame: () => void;

  // Quick play (vs bots)
  startQuickGame: (userId: string, nickname: string, slug: string, botCount?: number) => void;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  room: null,
  gameState: null,
  selectedPieceId: null,
  animatingPieceId: null,
  stepAnimationPos: null,
  lastCapturedPieceId: null,
  showDiceResult: false,

  createRoom: async (hostId, hostNickname, hostSlug) => {
    const res = await fetch('/api/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: hostId, nickname: hostNickname, slug: hostSlug }),
    });
    const data = await res.json();
    if (data.success) {
      set({ room: data.room });
      return data.room.code as string;
    }
    throw new Error(data.error || 'Failed to create room');
  },

  joinRoom: async (code, userId, nickname, slug) => {
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userId, nickname, slug }),
      });
      const data = await res.json();
      if (data.success) {
        set({ room: data.room });
        // If game already in progress, fetch the game state immediately
        if (data.room?.status === 'playing') {
          const store = get();
          void store.pollGameState(code);
        }
        return { success: true };
      }
      return { success: false, error: data.error || 'Could not join room' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  },

  refreshRoom: async (code: string) => {
    try {
      const res = await fetch(`/api/rooms/${code}`);
      const data = await res.json();
      if (data.success) {
        set({ room: data.room });
      }
    } catch {
      // Keep existing room state
    }
  },

  leaveRoom: async (userId) => {
    const state = get();
    if (!state.room) return;

    try {
      await fetch(`/api/rooms/${state.room.code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', userId }),
      });
    } catch {
      // Continue with local cleanup even if API fails
    }

    set({ room: null });
  },

  setReady: (userId) => {
    const state = get();
    if (!state.room) return;

    set({
      room: {
        ...state.room,
        players: state.room.players.map(p =>
          p.userId === userId ? { ...p, isReady: !p.isReady } : p
        ),
      },
    });
  },

  startGame: async (userId: string) => {
    const state = get();
    if (!state.room || state.room.players.length < 2) return;

    const res = await fetch(`/api/game/${state.room.code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', userId }),
    });
    const data = await res.json();
    if (data.success) {
      set({
        gameState: data.gameState,
        room: { ...state.room, status: 'playing' },
      });
    } else {
      console.error('[startGame] server error:', data.error);
      throw new Error(data.error || 'Failed to start game');
    }
  },

  addBotToRoom: async () => {
    const state = get();
    if (!state.room || state.room.players.length >= state.room.maxPlayers) return;

    try {
      const res = await fetch(`/api/rooms/${state.room.code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addBot' }),
      });
      const data = await res.json();
      if (data.success) {
        set({ room: data.room });
      } else {
        console.error('[addBotToRoom] server error:', data.error);
      }
    } catch (err) {
      console.error('[addBotToRoom] network error:', err);
    }
  },

  removeBotFromRoom: async (botSlot) => {
    const state = get();
    if (!state.room) return;

    try {
      const res = await fetch(`/api/rooms/${state.room.code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeBot', botSlot }),
      });
      const data = await res.json();
      if (data.success) {
        set({ room: data.room });
      } else {
        console.error('[removeBotFromRoom] server error:', data.error);
      }
    } catch (err) {
      console.error('[removeBotFromRoom] network error:', err);
    }
  },

  startQuickGame: (userId, nickname, slug, botCount = 3) => {
    // For 2 players, use diagonal positions (red vs yellow)
    // Board layout: Red=top-left, Green=top-right, Yellow=bottom-right, Blue=bottom-left
    // Diagonals: Red↔Yellow, Green↔Blue
    const playerColor: PlayerColor = 'red';
    const player = createPlayer(crypto.randomUUID(), nickname, playerColor, false, userId, slug);

    const botNames = ['Bot Alpha', 'Bot Beta', 'Bot Gamma'];
    const botColors: PlayerColor[] = botCount === 1
      ? ['yellow']                    // diagonal to red (bottom-right vs top-left)
      : ['green', 'yellow', 'blue'];  // all remaining for 4-player

    const bots = botColors.slice(0, botCount).map((color, i) =>
      createPlayer(crypto.randomUUID(), botNames[i], color, true)
    );

    const gameState = createGameState([player, ...bots]);
    
    set({
      gameState,
      room: null,
      selectedPieceId: null,
      animatingPieceId: null,
    });
  },

  rollGameDice: (userId?: string) => {
    const state = get();
    if (!state.gameState || !state.gameState.dice.canRoll) return;

    // --- MULTIPLAYER: route through server ---
    if (state.room && userId) {
      // Show rolling animation locally
      set({
        gameState: {
          ...state.gameState,
          dice: { ...state.gameState.dice, isRolling: true, canRoll: false },
        },
        showDiceResult: false,
      });
      soundManager.playDiceRoll();

      fetch(`/api/game/${state.room.code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'roll', userId }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            soundManager.playDiceLand();
            if (data.diceValue === 6) soundManager.playSixRolled();
            const serverGs = data.gameState as GameState;
            // Show the dice value result immediately
            const currentGs = get().gameState;
            if (currentGs) {
              set({
                gameState: {
                  ...currentGs,
                  dice: { ...currentGs.dice, value: data.diceValue, isRolling: false, canRoll: false },
                },
                showDiceResult: true,
              });
            }
            if (data.needsMove) {
              // Player must pick a piece — apply server state immediately
              set({ gameState: serverGs, showDiceResult: true });
            } else {
              // Auto-moved/skipped — show result briefly then apply
              setTimeout(() => {
                set({ gameState: serverGs, showDiceResult: false });
              }, 800);
            }
          } else {
            // Server rejected the roll — always reset isRolling so dice stops blinking
            const gs = get().gameState;
            if (gs) set({ gameState: { ...gs, dice: { ...gs.dice, isRolling: false, canRoll: true } } });
          }
        })
        .catch(() => {
          // Network error — reset isRolling so dice stops blinking
          const gs = get().gameState;
          if (gs) set({ gameState: { ...gs, dice: { ...gs.dice, isRolling: false, canRoll: true } } });
        });
      return;
    }

    // --- LOCAL (Quick Play): original logic ---
    const value = rollDice();

    set({
      gameState: {
        ...state.gameState,
        dice: { ...state.gameState.dice, isRolling: true, canRoll: false },
      },
      showDiceResult: false,
    });

    soundManager.playDiceRoll();

    setTimeout(() => {
      const currentState = get();
      if (!currentState.gameState) return;

      soundManager.playDiceLand();
      if (value === 6) soundManager.playSixRolled();

      const player = currentState.gameState.players[currentState.gameState.currentPlayerIndex];
      const movable = getMovablePieces(player, value, currentState.gameState.players);

      const updatedState: GameState = {
        ...currentState.gameState,
        dice: { ...currentState.gameState.dice, value, isRolling: false, canRoll: false },
      };

      set({ gameState: updatedState, showDiceResult: true });

      if (movable.length === 0) {
        setTimeout(() => {
          const s = get();
          if (s.gameState) {
            const skipped = handleSkipTurn(s.gameState);
            set({ gameState: skipped, showDiceResult: false });
            const nextPlayer = skipped.players[skipped.currentPlayerIndex];
            if (nextPlayer?.isBot && skipped.phase === 'playing') {
              setTimeout(() => get().executeBotTurn(), 800);
            }
          }
        }, 1200);
      } else if (movable.length === 1) {
        setTimeout(() => { get().movePiece(movable[0].id); }, 600);
      } else if (player.isBot) {
        const botPieceId = getBotMove(player, value, currentState.gameState.players);
        if (botPieceId) {
          setTimeout(() => { get().movePiece(botPieceId); }, 600);
        }
      }
    }, 700);
  },

  selectPiece: (pieceId) => {
    set({ selectedPieceId: pieceId });
  },

  movePiece: (pieceId, userId?) => {
    const state = get();
    if (!state.gameState) return;

    // --- MULTIPLAYER: route through server ---
    if (state.room && userId) {
      set({ animatingPieceId: pieceId });
      soundManager.playPieceMove();

      fetch(`/api/game/${state.room.code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', userId, pieceId }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            const serverGs = data.gameState as GameState;
            if (data.moveAction === 'capture') soundManager.playCapture();
            if (data.moveAction === 'finish') soundManager.playPieceFinish();
            if (serverGs.phase === 'finished') soundManager.playVictory();

            setTimeout(() => {
              set({
                gameState: serverGs,
                selectedPieceId: null,
                animatingPieceId: null,
                showDiceResult: false,
                lastCapturedPieceId: null,
              });
            }, 300);
          }
        })
        .catch(() => {
          set({ animatingPieceId: null });
        });
      return;
    }

    // --- LOCAL (Quick Play): step-by-step animation ---
    const diceValue = state.gameState.dice.value;

    try {
      const result = executeMove(state.gameState, pieceId, diceValue);

      // Find the piece and its color in the CURRENT state (before the move)
      let movingColor: import('./types').PlayerColor = 'red';
      for (const pl of state.gameState.players) {
        if (pl.pieces.find(p => p.id === pieceId)) {
          movingColor = pl.color;
          break;
        }
      }

      const movingPiece = state.gameState.players
        .flatMap(pl => pl.pieces)
        .find(p => p.id === pieceId);

      const steps = movingPiece ? getMovementPath(movingPiece, diceValue) : [];

      // Mark piece as animating immediately
      set({ animatingPieceId: pieceId, selectedPieceId: null });

      const STEP_MS = 160; // ms per cell

      const runSteps = (stepIndex: number) => {
        if (stepIndex >= steps.length) {
          // All steps done — apply final state
          if (result.action === 'capture') {
            soundManager.playCapture();
            set({ lastCapturedPieceId: result.capturedPiece?.id || null });
          } else if (result.action === 'enter') {
            soundManager.playPieceEnter();
          } else if (result.action === 'finish') {
            soundManager.playPieceFinish();
          }
          if (result.gameState.phase === 'finished') soundManager.playVictory();

          setTimeout(() => {
            set({
              gameState: result.gameState,
              animatingPieceId: null,
              stepAnimationPos: null,
              showDiceResult: false,
              lastCapturedPieceId: null,
            });

            if (result.gameState.phase === 'playing') {
              const nextPlayer = result.gameState.players[result.gameState.currentPlayerIndex];
              if (nextPlayer?.isBot) {
                setTimeout(() => get().executeBotTurn(), 1000);
              }
            }
          }, 120);
          return;
        }

        const step = steps[stepIndex];
        soundManager.playPieceMove();
        set({
          stepAnimationPos: {
            pieceId,
            trackPosition: step.trackPosition,
            color: movingColor,
          },
        });

        setTimeout(() => runSteps(stepIndex + 1), STEP_MS);
      };

      if (steps.length === 0) {
        // Fallback (shouldn't happen) — instant move
        if (result.action === 'capture') {
          soundManager.playCapture();
          set({ lastCapturedPieceId: result.capturedPiece?.id || null });
        } else if (result.action === 'enter') {
          soundManager.playPieceEnter();
        } else if (result.action === 'finish') {
          soundManager.playPieceFinish();
        } else {
          soundManager.playPieceMove();
        }
        if (result.gameState.phase === 'finished') soundManager.playVictory();
        setTimeout(() => {
          set({
            gameState: result.gameState,
            selectedPieceId: null,
            animatingPieceId: null,
            stepAnimationPos: null,
            showDiceResult: false,
            lastCapturedPieceId: null,
          });
          if (result.gameState.phase === 'playing') {
            const nextPlayer = result.gameState.players[result.gameState.currentPlayerIndex];
            if (nextPlayer?.isBot) setTimeout(() => get().executeBotTurn(), 1000);
          }
        }, 400);
      } else {
        runSteps(0);
      }
    } catch {
      // Invalid move, ignore
    }
  },

  skipTurn: (userId?) => {
    const state = get();
    if (!state.gameState) return;

    // --- MULTIPLAYER: route through server ---
    if (state.room && userId) {
      fetch(`/api/game/${state.room.code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip', userId }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            set({ gameState: data.gameState as GameState, selectedPieceId: null, showDiceResult: false });
          }
        })
        .catch(() => { /* ignore */ });
      return;
    }

    // --- LOCAL (Quick Play) ---
    const newState = handleSkipTurn(state.gameState);
    set({ gameState: newState, selectedPieceId: null, showDiceResult: false });

    const nextPlayer = newState.players[newState.currentPlayerIndex];
    if (nextPlayer?.isBot && newState.phase === 'playing') {
      setTimeout(() => get().executeBotTurn(), 800);
    }
  },

  // Poll game state from server (for multiplayer — called by GameScreen)
  pollGameState: async (code: string) => {
    try {
      const res = await fetch(`/api/game/${code}`);
      const data = await res.json();
      console.log(`[pollGameState] code=${code} success=${data.success} status=${data.status} hasGs=${!!data.gameState}`);
      if (data.success && data.gameState) {
        const current = get().gameState;
        // Only update if server state is newer (based on updatedAt) or we have no local state
        const serverGs = data.gameState as GameState;
        // Sanitise: server should never persist isRolling=true, but defend against it
        const sanitised: GameState = {
          ...serverGs,
          dice: { ...serverGs.dice, isRolling: false },
        };
        if (!current || !current.updatedAt || sanitised.updatedAt >= current.updatedAt) {
          // Only overwrite if we are NOT in the middle of a local roll animation
          const localIsRolling = current?.dice.isRolling ?? false;
          if (!localIsRolling) {
            set({ gameState: sanitised });
          }
        }
      }
      // Always update room status if available (even if gameState is unchanged)
      if (data.success && data.status) {
        const room = get().room;
        if (room && room.status !== data.status) {
          set({ room: { ...room, status: data.status } });
        }
      }
    } catch {
      // ignore
    }
  },

  executeBotTurn: () => {
    const state = get();
    if (!state.gameState || state.gameState.phase !== 'playing') return;

    const player = state.gameState.players[state.gameState.currentPlayerIndex];
    if (!player.isBot) return;

    // Roll dice
    get().rollGameDice();
  },

  getCurrentPlayer: () => {
    const state = get();
    if (!state.gameState) return null;
    return state.gameState.players[state.gameState.currentPlayerIndex];
  },

  isCurrentPlayerTurn: (userId) => {
    const state = get();
    if (!state.gameState) return false;
    const currentPlayer = state.gameState.players[state.gameState.currentPlayerIndex];
    return currentPlayer.userId === userId;
  },

  resetGame: () => {
    set({
      gameState: null,
      room: null,
      selectedPieceId: null,
      animatingPieceId: null,
      stepAnimationPos: null,
      lastCapturedPieceId: null,
      showDiceResult: false,
    });
  },
}));
