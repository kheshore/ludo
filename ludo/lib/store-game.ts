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
              // Server already auto-moved (or skipped). Animate locally then apply serverGs
              // without sending another move request to the server.
              const localGs = get().gameState;
              let movedId: string | null = null;
              let prePiece: import('./types').Piece | null = null;
              let preColor: PlayerColor | null = null;
              if (localGs) {
                outer: for (const serverPlayer of serverGs.players) {
                  const localPlayer = localGs.players.find(p => p.id === serverPlayer.id);
                  if (!localPlayer) continue;
                  for (let pi = 0; pi < serverPlayer.pieces.length; pi++) {
                    const after = serverPlayer.pieces[pi];
                    const before = localPlayer.pieces[pi];
                    if (!before) continue;
                    if (
                      (before.state === 'home' && after.state === 'active') ||
                      (before.state === 'active' && after.trackPosition > before.trackPosition) ||
                      (before.state === 'active' && after.state === 'finished')
                    ) { movedId = after.id; prePiece = before; preColor = serverPlayer.color; break outer; }
                  }
                }
              }
              if (movedId && prePiece && preColor) {
                const postPiece = serverGs.players.flatMap(p => p.pieces).find(p => p.id === movedId);
                const dv = prePiece.state === 'home' ? 6 : Math.max(1, (postPiece?.trackPosition ?? 0) - prePiece.trackPosition);
                const steps = getMovementPath(prePiece, dv);
                if (steps.length > 0) {
                  set({ animatingPieceId: movedId, selectedPieceId: null });
                  const STEP_MS = 110;
                  let si = 0;
                  const runAutoSteps = () => {
                    if (si >= steps.length) {
                      if (prePiece!.state === 'home') soundManager.playPieceEnter();
                      else if (steps[steps.length - 1].state === 'finished') soundManager.playPieceFinish();
                      setTimeout(() => set({ gameState: serverGs, animatingPieceId: null, stepAnimationPos: null, showDiceResult: false }), 120);
                      return;
                    }
                    soundManager.playPieceMove();
                    set({ stepAnimationPos: { pieceId: movedId!, trackPosition: steps[si].trackPosition, color: preColor! } });
                    si++;
                    setTimeout(runAutoSteps, STEP_MS);
                  };
                  runAutoSteps();
                } else {
                  setTimeout(() => set({ gameState: serverGs, showDiceResult: false }), 400);
                }
              } else {
                // Turn skipped or no piece moved
                setTimeout(() => set({ gameState: serverGs, showDiceResult: false }), 800);
              }
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
              setTimeout(() => get().executeBotTurn(), 400);
            }
          }
        }, 700);
      } else if (movable.length === 1) {
        // Strict auto-move queue: only trigger after animation and state update
        const doAutoMove = () => {
          const s = get();
          if (s.animatingPieceId || s.stepAnimationPos) {
            setTimeout(doAutoMove, 60);
            return;
          }
          if (s.room && s.room.code && s.getCurrentPlayer) {
            const currentPlayer = s.getCurrentPlayer();
            if (currentPlayer?.userId) {
              get().movePiece(movable[0].id, currentPlayer.userId);
              return;
            }
          }
          get().movePiece(movable[0].id);
        };
        setTimeout(doAutoMove, 350);
      } else if (player.isBot) {
        const botPieceId = getBotMove(player, value, currentState.gameState.players);
        if (botPieceId) {
          setTimeout(() => { get().movePiece(botPieceId); }, 350);
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

    // --- MULTIPLAYER: run local step animation then apply server result ---
    if (state.room && userId) {
      const diceValueMP = state.gameState.dice.value;
      const movingPieceMP = state.gameState.players
        .flatMap(pl => pl.pieces)
        .find(p => p.id === pieceId);
      let movingColorMP: import('./types').PlayerColor = 'red';
      for (const pl of state.gameState.players) {
        if (pl.pieces.find(p => p.id === pieceId)) { movingColorMP = pl.color; break; }
      }
      const stepsMP = movingPieceMP ? getMovementPath(movingPieceMP, diceValueMP) : [];

      set({ animatingPieceId: pieceId, selectedPieceId: null });

      // Fire the server request immediately (runs in parallel with animation)
      const serverPromise = fetch(`/api/game/${state.room.code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', userId, pieceId }),
      }).then(r => r.json());

      const STEP_MS = 110;

      const applyServerResult = (data: { success: boolean; gameState: GameState; moveAction?: string }) => {
        if (!data.success) { set({ animatingPieceId: null }); return; }
        const serverGs = data.gameState as GameState;
        if (data.moveAction === 'capture') soundManager.playCapture();
        if (data.moveAction === 'finish') soundManager.playPieceFinish();
        if (serverGs.phase === 'finished') soundManager.playVictory();
        set({
          gameState: serverGs,
          selectedPieceId: null,
          animatingPieceId: null,
          stepAnimationPos: null,
          showDiceResult: false,
          lastCapturedPieceId: null,
        });
        // After applying server state, check if another auto-move is needed
        setTimeout(() => {
          const s = get();
          if (!s.gameState || !s.room || !s.getCurrentPlayer) return;
          // Only auto-move if the dice has already been rolled (canRoll=false)
          if (s.gameState.dice.canRoll) return;
          const player = s.getCurrentPlayer();
          if (!player || player.hasFinished) return;
          const value = s.gameState.dice.value;
          const movable = getMovablePieces(player, value, s.gameState.players);
          if (movable.length === 1 && !s.animatingPieceId && !s.stepAnimationPos) {
            get().movePiece(movable[0].id, player.userId);
          }
        }, 80);
      };

      if (stepsMP.length === 0) {
        soundManager.playPieceMove();
        serverPromise
          .then(data => setTimeout(() => applyServerResult(data), 300))
          .catch(() => set({ animatingPieceId: null, stepAnimationPos: null }));
        return;
      }

      const runStepsMP = (stepIndex: number) => {
        if (stepIndex >= stepsMP.length) {
          // Animation done — wait for server result then apply
          serverPromise
            .then(data => setTimeout(() => applyServerResult(data), 80))
            .catch(() => set({ animatingPieceId: null, stepAnimationPos: null }));
          return;
        }
        const step = stepsMP[stepIndex];
        soundManager.playPieceMove();
        set({ stepAnimationPos: { pieceId, trackPosition: step.trackPosition, color: movingColorMP } });
        setTimeout(() => runStepsMP(stepIndex + 1), STEP_MS);
      };

      runStepsMP(0);
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

      const STEP_MS = 110; // ms per cell

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
        const serverGs = data.gameState as GameState;
        const sanitised: GameState = {
          ...serverGs,
          dice: { ...serverGs.dice, isRolling: false },
        };
        if (!current || !current.updatedAt || sanitised.updatedAt >= current.updatedAt) {
          const localIsRolling = current?.dice.isRolling ?? false;
          const localIsAnimating = !!get().animatingPieceId;
          if (!localIsRolling && !localIsAnimating) {
            // Find a piece that moved forward — animate it step by step.
            // Our own moves are already applied via applyServerResult, so they won't
            // show a diff here; no need to filter by userId.
            let movedPieceId: string | null = null;
            let prePiece: import('./types').Piece | null = null;
            let movedColor: PlayerColor | null = null;

            if (current) {
              for (const player of sanitised.players) {
                const prevPlayer = current.players.find(p => p.id === player.id);
                if (!prevPlayer) continue;
                for (let pi = 0; pi < player.pieces.length; pi++) {
                  const piece = player.pieces[pi];
                  const prevPiece = prevPlayer.pieces[pi];
                  if (!prevPiece) continue;
                  const isForwardMove =
                    (prevPiece.state === 'home' && piece.state === 'active') ||
                    (prevPiece.state === 'active' && piece.trackPosition > prevPiece.trackPosition) ||
                    (prevPiece.state === 'active' && piece.state === 'finished');
                  if (isForwardMove) {
                    movedPieceId = piece.id;
                    prePiece = prevPiece;
                    movedColor = player.color;
                    break;
                  }
                }
                if (movedPieceId) break;
              }
            }

            if (movedPieceId && prePiece && movedColor) {
              let diceValue: number;
              if (prePiece.state === 'home') {
                diceValue = 6;
              } else {
                const postPiece = sanitised.players.flatMap(p => p.pieces).find(p => p.id === movedPieceId);
                diceValue = postPiece ? postPiece.trackPosition - prePiece.trackPosition : 6;
                if (diceValue <= 0) diceValue = 6;
              }

              const steps = getMovementPath(prePiece, diceValue);
              if (steps.length > 0) {
                set({ animatingPieceId: movedPieceId, selectedPieceId: null });
                const STEP_MS = 110;
                let stepIndex = 0;
                const runOpponentSteps = () => {
                  if (stepIndex >= steps.length) {
                    setTimeout(() => {
                      set({ gameState: sanitised, animatingPieceId: null, stepAnimationPos: null, showDiceResult: false });
                    }, 120);
                    return;
                  }
                  const step = steps[stepIndex];
                  set({ stepAnimationPos: { pieceId: movedPieceId!, trackPosition: step.trackPosition, color: movedColor! } });
                  stepIndex++;
                  setTimeout(runOpponentSteps, STEP_MS);
                };
                runOpponentSteps();
              } else {
                set({ gameState: sanitised });
              }
            } else {
              set({ gameState: sanitised });
            }
          }
        }
      }
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
