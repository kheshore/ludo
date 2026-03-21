'use client';

// ============================================================
// LudoBoard - The main 15x15 Ludo board with pieces
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store-game';
import { useAuthStore } from '@/lib/store-auth';
import {
  COLOR_CONFIG,
  PlayerColor,
  SAFE_POSITIONS,
} from '@/lib/types';
import {
  getGridPosition,
  HOME_BASE_COORDS,
  getMovablePieces,
} from '@/lib/game-engine';

const BOARD_GRID = 15;
const CELL_CLASSES: Record<string, string> = {
  red: 'bg-red-500/20',
  green: 'bg-green-500/20',
  yellow: 'bg-yellow-500/20',
  blue: 'bg-blue-500/20',
};

// Which cells belong to which color's home zone
function getHomezoneColor(row: number, col: number): PlayerColor | null {
  if (row < 6 && col < 6) return 'red';
  if (row < 6 && col > 8) return 'green';
  if (row > 8 && col > 8) return 'yellow';
  if (row > 8 && col < 6) return 'blue';
  return null;
}

// Home stretch cells
function getHomeStretchColor(row: number, col: number): PlayerColor | null {
  if (row === 7 && col >= 1 && col <= 5) return 'red';
  if (col === 7 && row >= 1 && row <= 5) return 'green';
  if (row === 7 && col >= 9 && col <= 13) return 'yellow';
  if (col === 7 && row >= 9 && row <= 13) return 'blue';
  return null;
}

// Is this cell on the main track?
function isTrackCell(row: number, col: number): boolean {
  // Horizontal tracks
  if (row === 6 && col >= 0 && col <= 5) return true;
  if (row === 8 && col >= 0 && col <= 5) return true;
  if (row === 6 && col >= 9 && col <= 14) return true;
  if (row === 8 && col >= 9 && col <= 14) return true;
  // Vertical tracks
  if (col === 6 && row >= 0 && row <= 5) return true;
  if (col === 8 && row >= 0 && row <= 5) return true;
  if (col === 6 && row >= 9 && row <= 14) return true;
  if (col === 8 && row >= 9 && row <= 14) return true;
  // Corners
  if (row === 6 && col === 6) return true;
  if (row === 6 && col === 8) return true;
  if (row === 8 && col === 6) return true;
  if (row === 8 && col === 8) return true;
  // Entry columns/rows
  if (row === 0 && (col === 6 || col === 7 || col === 8)) return true;
  if (row === 14 && (col === 6 || col === 7 || col === 8)) return true;
  if (col === 0 && (row === 6 || row === 7 || row === 8)) return true;
  if (col === 14 && (row === 6 || row === 7 || row === 8)) return true;
  return false;
}

function isSafeCell(row: number, col: number): boolean {
  // Check if any safe position maps to this cell
  for (const color of ['red', 'green', 'yellow', 'blue'] as PlayerColor[]) {
    for (const safePos of SAFE_POSITIONS) {
      const grid = getGridPosition(safePos, color);
      if (grid && grid.row === row && grid.col === col) return true;
    }
  }
  return false;
}

function isCenterCell(row: number, col: number): boolean {
  return row >= 6 && row <= 8 && col >= 6 && col <= 8 && !(row === 6 && col === 6) && !(row === 6 && col === 8) && !(row === 8 && col === 6) && !(row === 8 && col === 8);
}

export default function LudoBoard() {
  const { gameState, selectedPieceId, animatingPieceId, movePiece } = useGameStore();
  const room = useGameStore(s => s.room);
  const { user } = useAuthStore();

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.userId === user?.id;
  const diceValue = gameState.dice.value;
  const movablePieces = isMyTurn && !gameState.dice.isRolling && !gameState.dice.canRoll
    ? getMovablePieces(currentPlayer, diceValue, gameState.players)
    : [];
  const movablePieceIds = new Set(movablePieces.map(p => p.id));

  // Build a map of grid positions to pieces
  const piecePositions = new Map<string, { pieceId: string; color: PlayerColor; isMovable: boolean }[]>();

  for (const player of gameState.players) {
    for (const piece of player.pieces) {
      let gridPos: { row: number; col: number } | null = null;

      if (piece.state === 'home') {
        const homeCoords = HOME_BASE_COORDS[player.color];
        gridPos = homeCoords[piece.index];
      } else if (piece.state === 'active') {
        gridPos = getGridPosition(piece.trackPosition, player.color);
      } else if (piece.state === 'finished') {
        // Show finished pieces in center
        const centerPositions = [
          { row: 7, col: 7 },
          { row: 6, col: 7 },
          { row: 7, col: 6 },
          { row: 7, col: 8 },
        ];
        gridPos = centerPositions[piece.index % 4];
      }

      if (gridPos) {
        const key = `${gridPos.row}-${gridPos.col}`;
        if (!piecePositions.has(key)) piecePositions.set(key, []);
        piecePositions.get(key)!.push({
          pieceId: piece.id,
          color: player.color,
          isMovable: movablePieceIds.has(piece.id),
        });
      }
    }
  }

  const handlePieceClick = (pieceId: string) => {
    if (!isMyTurn) return;
    if (!movablePieceIds.has(pieceId)) return;
    movePiece(pieceId, room ? user?.id : undefined);
  };

  return (
    <div className="w-full max-w-[min(95vw,400px)] aspect-square mx-auto">
      <div
        className="grid gap-px w-full h-full rounded-2xl overflow-hidden p-1"
        style={{
          gridTemplateColumns: `repeat(${BOARD_GRID}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD_GRID}, 1fr)`,
          background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {Array.from({ length: BOARD_GRID * BOARD_GRID }).map((_, idx) => {
          const row = Math.floor(idx / BOARD_GRID);
          const col = idx % BOARD_GRID;
          const key = `${row}-${col}`;
          const pieces = piecePositions.get(key) || [];
          const homezoneColor = getHomezoneColor(row, col);
          const homeStretchColor = getHomeStretchColor(row, col);
          const isTrack = isTrackCell(row, col);
          const isSafe = isSafeCell(row, col);
          const isCenter = isCenterCell(row, col);

          let cellBg = 'bg-gray-900/50';
          if (isCenter) {
            cellBg = 'bg-linear-to-br from-amber-500/30 to-amber-600/20';
          } else if (homeStretchColor) {
            cellBg = CELL_CLASSES[homeStretchColor];
          } else if (homezoneColor) {
            cellBg = CELL_CLASSES[homezoneColor];
          } else if (isTrack) {
            cellBg = 'bg-gray-800/60';
          }

          // For stacked pieces, compute sub-positions within the cell
          const getStackLayout = (count: number, idx: number) => {
            if (count === 1) return { x: 0, y: 0, size: 'normal' as const };
            if (count === 2) {
              const offsets = [{ x: -30, y: -30 }, { x: 30, y: 30 }];
              return { ...offsets[idx], size: 'small' as const };
            }
            if (count === 3) {
              const offsets = [{ x: -30, y: -25 }, { x: 30, y: -25 }, { x: 0, y: 30 }];
              return { ...offsets[idx], size: 'small' as const };
            }
            // 4 pieces
            const offsets = [{ x: -30, y: -30 }, { x: 30, y: -30 }, { x: -30, y: 30 }, { x: 30, y: 30 }];
            return { ...offsets[idx], size: 'tiny' as const };
          };

          const sizeClasses = {
            normal: 'w-4 h-4 sm:w-5 sm:h-5',
            small: 'w-3 h-3 sm:w-3.5 sm:h-3.5',
            tiny: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
          };

          return (
            <div
              key={key}
              className={`relative flex items-center justify-center ${cellBg}`}
              style={{ borderRadius: '2px' }}
            >
              {/* Safe position star */}
              {isSafe && pieces.length === 0 && (
                <span className="absolute text-[8px] sm:text-[10px] text-amber-400/80 font-bold select-none z-1">★</span>
              )}
              {isSafe && pieces.length > 0 && (
                <span className="absolute top-0 right-0 text-[5px] sm:text-[6px] text-amber-400/70 leading-none select-none z-30">★</span>
              )}

              {/* Multi-piece count badge */}
              {pieces.length > 1 && (
                <span className="absolute top-0 left-0 text-[5px] sm:text-[6px] bg-white/90 text-gray-900 rounded-full w-2.5 h-2.5 sm:w-3 sm:h-3 flex items-center justify-center font-bold z-30 leading-none">
                  {pieces.length}
                </span>
              )}

              {/* Pieces */}
              <AnimatePresence>
                {pieces.map((p, pIdx) => {
                  const isSelected = selectedPieceId === p.pieceId;
                  const isAnimating = animatingPieceId === p.pieceId;
                  const config = COLOR_CONFIG[p.color];
                  const layout = getStackLayout(pieces.length, pIdx);

                  return (
                    <motion.div
                      key={p.pieceId}
                      className={`absolute cursor-pointer z-10 ${p.isMovable ? 'z-20' : ''}`}
                      style={{
                        transform: `translate(${layout.x}%, ${layout.y}%)`,
                      }}
                      initial={{ scale: 0 }}
                      animate={{
                        scale: isAnimating ? 1.4 : isSelected ? 1.3 : 1,
                        y: p.isMovable && !isSelected ? [0, -3, 0] : 0,
                      }}
                      exit={{ scale: 0 }}
                      transition={
                        isAnimating
                          ? { scale: { type: 'spring', stiffness: 300, damping: 10 } }
                          : p.isMovable && !isSelected
                          ? { y: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }, scale: { type: 'spring', stiffness: 400, damping: 15 } }
                          : { type: 'spring', stiffness: 400, damping: 15 }
                      }
                      onClick={() => handlePieceClick(p.pieceId)}
                    >
                      <div
                        className={`${sizeClasses[layout.size]} rounded-full border-2 border-white/80`}
                        style={{
                          backgroundColor: config.hex,
                          boxShadow: isSelected
                            ? `0 0 12px ${config.glow}, 0 0 24px ${config.glow}`
                            : p.isMovable
                            ? `0 0 8px ${config.glow}`
                            : `0 2px 4px rgba(0,0,0,0.3)`,
                        }}
                      >
                        <div
                          className="w-full h-full rounded-full"
                          style={{
                            background: `radial-gradient(circle at 35% 35%, ${config.light}, transparent 70%)`,
                          }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
