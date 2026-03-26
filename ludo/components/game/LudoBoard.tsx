'use client';

// ============================================================
// LudoBoard – Clean flat Ludo board matching classic reference
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store-game';
import { useAuthStore } from '@/lib/store-auth';
import { useThemeStore } from '@/lib/store-theme';
import { BOARD_THEMES, BoardTheme } from '@/lib/themes';
import type { PawnStyleId, HomeLayout } from '@/lib/themes';
import {
  COLOR_CONFIG,
  PlayerColor,
  SAFE_POSITIONS,
} from '@/lib/types';
import {
  getGridPosition,
  getMovablePieces,
} from '@/lib/game-engine';

const BOARD_GRID = 15;

// ---- Cell classification ----

function getHomezoneColor(row: number, col: number): PlayerColor | null {
  if (row >= 0 && row <= 5 && col >= 0 && col <= 5) return 'red';
  if (row >= 0 && row <= 5 && col >= 9 && col <= 14) return 'green';
  if (row >= 9 && row <= 14 && col >= 9 && col <= 14) return 'yellow';
  if (row >= 9 && row <= 14 && col >= 0 && col <= 5) return 'blue';
  return null;
}

function getHomeStretchColor(row: number, col: number): PlayerColor | null {
  if (row === 7 && col >= 1 && col <= 5) return 'red';
  if (col === 7 && row >= 1 && row <= 5) return 'green';
  if (row === 7 && col >= 9 && col <= 13) return 'yellow';
  if (col === 7 && row >= 9 && row <= 13) return 'blue';
  return null;
}

function isSafeCell(row: number, col: number): boolean {
  for (const color of ['red', 'green', 'yellow', 'blue'] as PlayerColor[]) {
    for (const safePos of SAFE_POSITIONS) {
      const grid = getGridPosition(safePos, color);
      if (grid && grid.row === row && grid.col === col) return true;
    }
  }
  return false;
}

function isCenterCell(row: number, col: number): boolean {
  return (
    row >= 6 && row <= 8 && col >= 6 && col <= 8 &&
    !(row === 6 && col === 6) &&
    !(row === 6 && col === 8) &&
    !(row === 8 && col === 6) &&
    !(row === 8 && col === 8)
  );
}

// ---- Stack layout helper ----

function getStackLayout(count: number, idx: number): { x: number; y: number; size: 'normal' | 'small' | 'tiny' } {
  if (count === 1) return { x: 0, y: 0, size: 'normal' };
  if (count === 2) {
    const offsets = [{ x: -4, y: -3 }, { x: 4, y: 3 }];
    return { ...offsets[idx], size: 'small' };
  }
  if (count === 3) {
    const offsets = [{ x: -4, y: -3 }, { x: 4, y: -3 }, { x: 0, y: 4 }];
    return { ...offsets[idx], size: 'small' };
  }
  const offsets = [{ x: -4, y: -3 }, { x: 4, y: -3 }, { x: -4, y: 3 }, { x: 4, y: 3 }];
  return { ...offsets[idx], size: 'tiny' };
}

// ---- Piece token (coin) ----

interface TokenProps {
  color: PlayerColor;
  isMovable: boolean;
  isSelected: boolean;
  isAnimating: boolean;
  size: 'normal' | 'small' | 'tiny';
  offsetX: number;
  offsetY: number;
  pieceId: string;
  pawnStyle: PawnStyleId;
  onClick: () => void;
}

function PieceToken({ color, isMovable, isSelected, isAnimating, size, offsetX, offsetY, pieceId, pawnStyle, onClick }: TokenProps) {
  const cfg = COLOR_CONFIG[color];

  const d = {
    normal: { diam: 18, rim: 3,   shine: 5 },
    small:  { diam: 14, rim: 2.5, shine: 4 },
    tiny:   { diam: 11, rim: 2,   shine: 3 },
  }[size];

  const hex   = cfg.hex;
  const light = cfg.light;
  const dark  = cfg.dark;
  const glow  = cfg.glow;

  return (
    <motion.div
      className="absolute cursor-pointer"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{
        scale: isAnimating ? 1.3 : isSelected ? 1.15 : 1,
        opacity: 1,
        y: isAnimating ? [0, -6, 0] : isMovable && !isSelected ? [0, -2, 0] : 0,
      }}
      exit={{ scale: 0.4, opacity: 0 }}
      transition={
        isAnimating
          ? {
              y: { duration: 0.25, repeat: Infinity, ease: 'easeInOut' },
              scale: { type: 'spring', stiffness: 400, damping: 16 },
              opacity: { duration: 0.08 },
            }
          : isMovable && !isSelected
          ? {
              y: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' },
              scale: { type: 'spring', stiffness: 420, damping: 20 },
              opacity: { duration: 0.1 },
            }
          : {
              scale: { type: 'spring', stiffness: 420, damping: 20 },
              opacity: { duration: 0.1 },
            }
      }
      style={{
        left: '50%',
        top: '50%',
        marginLeft: `${offsetX - d.diam / 2}px`,
        marginTop:  `${offsetY - d.diam / 2}px`,
        width:  d.diam,
        height: d.diam,
        zIndex: isAnimating ? 50 : isMovable ? 25 : 12,
        filter: isAnimating
          ? `drop-shadow(0 0 8px ${glow}) drop-shadow(0 3px 6px rgba(0,0,0,0.5))`
          : isSelected
          ? `drop-shadow(0 0 5px ${glow}) drop-shadow(0 2px 4px rgba(0,0,0,0.4))`
          : isMovable
          ? `drop-shadow(0 0 4px ${glow}) drop-shadow(0 2px 3px rgba(0,0,0,0.3))`
          : `drop-shadow(0 1px 3px rgba(0,0,0,0.4))`,
      }}
      onClick={onClick}
    >
      {pawnStyle === 'coin' && (
        <>
          {/* Rim */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `radial-gradient(circle at 40% 35%, ${dark}, ${dark}cc)`,
            boxShadow: `inset 0 ${d.rim}px ${d.rim * 2}px rgba(0,0,0,0.45),
                        inset 0 -${d.rim}px ${d.rim}px rgba(255,255,255,0.07),
                        0 0 0 ${isSelected || isMovable ? 1.5 : 0}px ${hex}`,
          }} />
          {/* Face */}
          <div style={{
            position: 'absolute', inset: d.rim, borderRadius: '50%',
            background: `radial-gradient(circle at 38% 32%, ${light} 0%, ${hex} 45%, ${dark} 100%)`,
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.35)',
          }} />
          {/* Center dot */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: d.diam * 0.25, height: d.diam * 0.25,
            borderRadius: '50%',
            background: `radial-gradient(circle at 40% 35%, ${light}, ${hex})`,
            boxShadow: `0 0 ${d.rim}px rgba(255,255,255,0.25)`,
            pointerEvents: 'none',
          }} />
          {/* Specular */}
          <div style={{
            position: 'absolute', top: d.rim + 1, left: d.rim + 2,
            width: d.shine, height: d.shine * 0.55,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            filter: 'blur(1px)',
            transform: 'rotate(-30deg)',
            pointerEvents: 'none',
          }} />
        </>
      )}

      {pawnStyle === 'flat' && (
        <>
          {/* Flat disc */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: hex,
            border: `${d.rim}px solid ${dark}`,
            boxShadow: `0 2px ${d.rim * 2}px rgba(0,0,0,0.35),
                        0 0 0 ${isSelected || isMovable ? 1.5 : 0}px ${hex}`,
          }} />
          {/* Inner ring */}
          <div style={{
            position: 'absolute',
            inset: d.rim + 2,
            borderRadius: '50%',
            border: `1px solid rgba(255,255,255,0.4)`,
            pointerEvents: 'none',
          }} />
        </>
      )}

      {pawnStyle === 'crystal' && (
        <>
          {/* Crystal facets via conic gradient */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `conic-gradient(from 0deg, ${dark}, ${hex}, ${light}, ${hex}, ${dark})`,
            boxShadow: `0 0 ${d.rim * 3}px ${hex}88,
                        inset 0 1px ${d.rim * 2}px rgba(255,255,255,0.5),
                        0 0 0 ${isSelected || isMovable ? 1.5 : 0}px ${light}`,
          }} />
          {/* Overlay sheen */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, transparent 50%, rgba(0,0,0,0.15) 100%)',
            pointerEvents: 'none',
          }} />
          {/* Bright sparkle */}
          <div style={{
            position: 'absolute', top: '18%', left: '22%',
            width: d.diam * 0.28, height: d.diam * 0.16,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.75)',
            filter: 'blur(1.5px)',
            transform: 'rotate(-30deg)',
            pointerEvents: 'none',
          }} />
        </>
      )}

      {pawnStyle === 'star' && (
        <svg
          viewBox="0 0 24 24"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <polygon
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
            fill={hex}
            stroke={dark}
            strokeWidth={isSelected || isMovable ? 1.5 : 0.8}
            filter={isSelected ? `drop-shadow(0 0 3px ${glow})` : undefined}
          />
          <polygon
            points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
            fill="none"
            stroke={light}
            strokeWidth={0.5}
            opacity={0.6}
          />
        </svg>
      )}

      {pawnStyle === 'arrow' && (
        <svg
          viewBox="0 0 24 24"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          {/* Arrow body */}
          <path
            d="M12 2 L20 16 L12 13 L4 16 Z"
            fill={hex}
            stroke={dark}
            strokeWidth={isSelected || isMovable ? 1.5 : 0.8}
            strokeLinejoin="round"
            filter={isSelected ? `drop-shadow(0 0 3px ${glow})` : undefined}
          />
          {/* Highlight */}
          <path
            d="M12 2 L16 12 L12 10.5 Z"
            fill={light}
            opacity={0.5}
          />
        </svg>
      )}

      {pawnStyle === 'crown' && (
        <svg
          viewBox="0 0 24 24"
          style={{ position: 'absolute', inset: 2, width: 'calc(100% - 4px)', height: 'calc(100% - 4px)' }}
        >
          {/* Crown shape */}
          <path
            d="M2 18 L4 8 L8.5 13 L12 4 L15.5 13 L20 8 L22 18 Z"
            fill={hex}
            stroke={dark}
            strokeWidth={isSelected || isMovable ? 1.5 : 0.8}
            strokeLinejoin="round"
            filter={isSelected ? `drop-shadow(0 0 3px ${glow})` : undefined}
          />
          {/* Crown band */}
          <rect x="2" y="17" width="20" height="3" rx="1" fill={dark} opacity={0.7} />
          {/* Highlight */}
          <path d="M12 4 L14 11 L12 9.5 L10 11 Z" fill={light} opacity={0.55} />
        </svg>
      )}
    </motion.div>
  );
}

// ---- Board cell ----

interface CellProps {
  row: number;
  col: number;
  pieces: { pieceId: string; color: PlayerColor; isMovable: boolean }[];
  isSafe: boolean;
  isCenter: boolean;
  homezoneColor: PlayerColor | null;
  homeStretchColor: PlayerColor | null;
  selectedPieceId: string | null;
  animatingPieceId: string | null;
  theme: BoardTheme;
  pawnStyle: PawnStyleId;
  homeLayout: HomeLayout;
  onPieceClick: (id: string) => void;
}

function BoardCell({
  row, col, pieces, isSafe, isCenter,
  homezoneColor, homeStretchColor,
  selectedPieceId, animatingPieceId, theme, pawnStyle, homeLayout, onPieceClick,
}: CellProps) {

  const renderPieces = () => (
    <div className="relative w-full h-full">
      {pieces.length > 1 && (
        <span style={{
          position: 'absolute', top: 0, left: 0,
          fontSize: '5px', background: 'rgba(0,0,0,0.65)', color: '#fff',
          borderRadius: '50%', width: 10, height: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', zIndex: 35, lineHeight: 1,
        }}>{pieces.length}</span>
      )}
      <AnimatePresence>
        {pieces.map((p, pIdx) => {
          const layout = getStackLayout(pieces.length, pIdx);
          return (
            <PieceToken
              key={p.pieceId}
              pieceId={p.pieceId}
              color={p.color}
              isMovable={p.isMovable}
              isSelected={selectedPieceId === p.pieceId}
              isAnimating={animatingPieceId === p.pieceId}
              size={layout.size}
              offsetX={layout.x}
              offsetY={layout.y}
              pawnStyle={pawnStyle}
              onClick={() => onPieceClick(p.pieceId)}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );

  // ── Home zone ──
  if (homezoneColor) {
    const homeColors: Record<PlayerColor, string> = {
      red: theme.homeRed, green: theme.homeGreen, yellow: theme.homeYellow, blue: theme.homeBlue,
    };

    // ── single-box: entire inner area is one large box per color ──
    if (homeLayout === 'single-box') {
      // Determine which cell is the "anchor" (top-left of the inner 4×4 block)
      // We render pieces only in the anchor cell; all other inner cells are empty fill.
      const innerAnchors: Record<PlayerColor, { row: number; col: number }> = {
        red:    { row: 1, col: 1 },
        green:  { row: 1, col: 10 },
        yellow: { row: 10, col: 10 },
        blue:   { row: 10, col: 1 },
      };
      const anchor = innerAnchors[homezoneColor];
      const isAnchor = row === anchor.row && col === anchor.col;

      const isWhiteInner =
        (homezoneColor === 'red'    && row >= 1 && row <= 4 && col >= 1 && col <= 4) ||
        (homezoneColor === 'green'  && row >= 1 && row <= 4 && col >= 10 && col <= 13) ||
        (homezoneColor === 'yellow' && row >= 10 && row <= 13 && col >= 10 && col <= 13) ||
        (homezoneColor === 'blue'   && row >= 10 && row <= 13 && col >= 1 && col <= 4);

      if (!isWhiteInner) {
        // Outer ring cell
        return (
          <div style={{ background: homeColors[homezoneColor], border: `1px solid ${theme.homeInnerBorder}`, position: 'relative' }} />
        );
      }

      if (isAnchor) {
        // The anchor spans the full 4×4 visually via overflow + absolute positioning trick:
        // We make it position:relative and let pieces render normally; the big colored box
        // is shown as a background on this cell only. The other 15 inner cells are transparent.
        return (
          <div style={{
            background: theme.homeInnerBg,
            border: `2px solid ${homeColors[homezoneColor]}`,
            borderRadius: 4,
            position: 'relative',
            // Expand to cover the full 4×4 block (each cell = 1/15 of board width)
            // We use a CSS outline trick — width/height stay at 1 cell but we
            // draw an overlay div sized 4×4 behind the pieces.
            overflow: 'visible',
          }}>
            {/* Big colored background box covering all 4×4 inner cells */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0,
              // 4 cells wide/tall relative to this 1-cell container
              width: '400%', height: '400%',
              background: theme.homeInnerBg,
              border: `3px solid ${homeColors[homezoneColor]}`,
              borderRadius: 8,
              zIndex: 0,
              pointerEvents: 'none',
            }} />
            {/* All pieces for this color rendered at the 4 fixed offsets */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
              {renderPieces()}
            </div>
          </div>
        );
      }

      // Other inner cells — transparent so the big box shows through
      return <div style={{ background: 'transparent', border: 'none', position: 'relative' }} />;
    }

    // ── four-slot (default): white box rendered as board-level overlay (see HomeZoneOverlay)
    // Grid cells here just provide the background fill — pieces are handled by the overlay.
    const isWhiteInner =
      (homezoneColor === 'red'    && row >= 1 && row <= 4 && col >= 1 && col <= 4) ||
      (homezoneColor === 'green'  && row >= 1 && row <= 4 && col >= 10 && col <= 13) ||
      (homezoneColor === 'yellow' && row >= 10 && row <= 13 && col >= 10 && col <= 13) ||
      (homezoneColor === 'blue'   && row >= 10 && row <= 13 && col >= 1 && col <= 4);

    if (isWhiteInner) {
      return <div style={{ background: theme.homeInnerBg, border: `1px solid ${theme.homeInnerBorder}`, position: 'relative' }} />;
    }
    return <div style={{ background: homeColors[homezoneColor], border: `1px solid ${theme.homeInnerBorder}`, position: 'relative' }} />;
  }

  // ── Center cell ──
  if (isCenter) {
    // Pieces are rendered in the FinishedPiecesOverlay above CenterOverlay, not here
    return (
      <div style={{ background: theme.centerBg, border: `1px solid ${theme.trackBorder}`, position: 'relative', zIndex: 0 }} />
    );
  }

  // ── Home stretch ──
  if (homeStretchColor) {
    const stretchColors: Record<PlayerColor, string> = {
      red: theme.stretchRed, green: theme.stretchGreen,
      yellow: theme.stretchYellow, blue: theme.stretchBlue,
    };
    return (
      <div style={{
        background: stretchColors[homeStretchColor],
        border: `1px solid ${theme.trackBorder}`,
        position: 'relative',
      }}>
        {renderPieces()}
      </div>
    );
  }

  // ── Track / regular white cell ──
  return (
    <div style={{ background: theme.trackBg, border: `1px solid ${theme.trackBorder}`, position: 'relative' }}>
      {isSafe && pieces.length === 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: '42%', height: '42%',
          borderRadius: '50%',
          background: theme.trackSafeMarker,
          pointerEvents: 'none',
          zIndex: 3,
        }} />
      )}
      {renderPieces()}
    </div>
  );
}

// ---- Home zone overlay (absolute, outside overflow:hidden grid) ----

interface HomeZoneOverlayProps {
  color: PlayerColor;
  cellPct: number;
  pieces: { pieceId: string; color: PlayerColor; isMovable: boolean }[];
  theme: BoardTheme;
  pawnStyle: PawnStyleId;
  selectedPieceId: string | null;
  animatingPieceId: string | null;
  onPieceClick: (id: string) => void;
}

function HomeZoneOverlay({
  color, cellPct, pieces, theme, pawnStyle,
  selectedPieceId, animatingPieceId, onPieceClick,
}: HomeZoneOverlayProps) {
  const homeColors: Record<PlayerColor, string> = {
    red: theme.homeRed, green: theme.homeGreen,
    yellow: theme.homeYellow, blue: theme.homeBlue,
  };
  const hc = homeColors[color];

  // Inner 4×4 block starts at grid cell (1,1) for red, etc.
  const innerStart: Record<PlayerColor, { row: number; col: number }> = {
    red:    { row: 1, col: 1  },
    green:  { row: 1, col: 10 },
    yellow: { row: 10, col: 10 },
    blue:   { row: 10, col: 1 },
  };
  const { row: startRow, col: startCol } = innerStart[color];

  // Position the overlay exactly over the 4×4 inner block
  const left   = `${cellPct * startCol}%`;
  const top    = `${cellPct * startRow}%`;
  const size   = `${cellPct * 4}%`;

  const PAD = 7;
  const GAP = 6;
  const CS  = 40;
  const slotPositions = [
    { top: PAD,       left: PAD       },
    { top: PAD,       left: PAD+CS+GAP },
    { top: PAD+CS+GAP, left: PAD      },
    { top: PAD+CS+GAP, left: PAD+CS+GAP },
  ];

  return (
    <div style={{
      position: 'absolute',
      left, top,
      width: size, height: size,
      background: theme.homeInnerBg,
      border: `3px solid ${hc}`,
      borderRadius: 8,
      zIndex: 20,
    }}>
      {slotPositions.map((pos, i) => {
        const piece = pieces[i];
        return (
          <div key={i} style={{
            position: 'absolute',
            top: `${pos.top}%`, left: `${pos.left}%`,
            width: `${CS}%`, height: `${CS}%`,
            borderRadius: '50%',
            background: piece
              ? `radial-gradient(circle at 35% 30%, ${hc}33, ${hc}22)`
              : `radial-gradient(circle at 35% 30%, ${hc}dd, ${hc}bb)`,
            border: `2px solid ${hc}${piece ? '44' : 'cc'}`,
            boxShadow: piece ? 'none' : `inset 0 2px 8px rgba(0,0,0,0.2), inset 0 -1px 4px rgba(255,255,255,0.3)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {piece && (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <PieceToken
                  pieceId={piece.pieceId}
                  color={piece.color}
                  isMovable={piece.isMovable}
                  isSelected={selectedPieceId === piece.pieceId}
                  isAnimating={animatingPieceId === piece.pieceId}
                  size="normal"
                  offsetX={0}
                  offsetY={0}
                  pawnStyle={pawnStyle}
                  onClick={() => onPieceClick(piece.pieceId)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Center star overlay (4 triangles) ----

function CenterOverlay({ theme }: { theme: BoardTheme }) {
  return (
    <svg
      viewBox="0 0 3 3"
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 10,
      }}
      preserveAspectRatio="none"
    >
      {/* Red — left */}
      <polygon points="0,0 0,3 1.5,1.5" fill={theme.homeRed} />
      {/* Green — top */}
      <polygon points="0,0 3,0 1.5,1.5" fill={theme.homeGreen} />
      {/* Yellow — right */}
      <polygon points="3,0 3,3 1.5,1.5" fill={theme.homeYellow} />
      {/* Blue — bottom */}
      <polygon points="0,3 3,3 1.5,1.5" fill={theme.homeBlue} />
      {/* White center circle */}
      <circle cx="1.5" cy="1.5" r="0.4" fill="white" opacity="0.95" />
    </svg>
  );
}

// ---- Main board ----

export default function LudoBoard() {
  const { gameState, selectedPieceId, animatingPieceId, stepAnimationPos, movePiece } = useGameStore();
  const room = useGameStore(s => s.room);
  const { user } = useAuthStore();
  const { boardThemeId, pawnStyleId } = useThemeStore();
  const theme = BOARD_THEMES[boardThemeId] ?? BOARD_THEMES['classic'];

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.userId === user?.id;
  const diceValue = gameState.dice.value;
  // Show movable pieces when: it's my turn, dice has been rolled (not rolling, not canRoll),
  // AND no piece is currently animating (animatingPieceId would cover it)
  const movablePieces = isMyTurn && !gameState.dice.isRolling && !gameState.dice.canRoll && !animatingPieceId
    ? getMovablePieces(currentPlayer, diceValue, gameState.players)
    : [];
  const movablePieceIds = new Set(movablePieces.map(p => p.id));

  // Build piece position map
  const piecePositions = new Map<string, { pieceId: string; color: PlayerColor; isMovable: boolean }[]>();

  for (const player of gameState.players) {
    for (const piece of player.pieces) {
      let gridPos: { row: number; col: number } | null = null;

      // In single-box home layout, all home pieces for a color share the anchor cell
      const HOME_ANCHORS: Record<PlayerColor, { row: number; col: number }> = {
        red:    { row: 1, col: 1 },
        green:  { row: 1, col: 10 },
        yellow: { row: 10, col: 10 },
        blue:   { row: 10, col: 1 },
      };

      if (stepAnimationPos && stepAnimationPos.pieceId === piece.id) {
        gridPos = getGridPosition(stepAnimationPos.trackPosition, player.color);
      } else if (piece.state === 'home') {
        // All home pieces route to the anchor cell; rendered spread within the overlay
        gridPos = HOME_ANCHORS[player.color];
      } else if (piece.state === 'active') {
        gridPos = getGridPosition(piece.trackPosition, player.color);
      }

      // Finished pieces go to a special key rendered in the center overlay
      const mapKey = piece.state === 'finished'
        ? 'finished'
        : gridPos ? `${gridPos.row}-${gridPos.col}` : null;

      if (mapKey) {
        if (!piecePositions.has(mapKey)) piecePositions.set(mapKey, []);
        piecePositions.get(mapKey)!.push({
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

  const cellPct = 100 / 15;

  return (
    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: 'min(92vw, 420px)',
          aspectRatio: '1',
          position: 'relative',
          borderRadius: theme.boardRadius,
          // No overflow:hidden here — that was clipping pieces in edge cells (col 0, col 14, row 0, row 14)
          // The decorative frame is applied via a non-interactive overlay div below
          boxShadow: theme.boardShadow,
          border: `3px solid ${theme.boardBorder}`,
          background: theme.boardBg,
        }}
      >
        {/* Non-interactive rounded frame overlay — keeps visual border-radius without clipping pieces */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: theme.boardRadius,
          pointerEvents: 'none',
          zIndex: 100,
          boxShadow: `inset 0 0 0 3px ${theme.boardBorder}`,
          overflow: 'hidden',
        }} />
        {/* 15x15 Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${BOARD_GRID}, 1fr)`,
            gridTemplateRows:    `repeat(${BOARD_GRID}, 1fr)`,
            width: '100%',
            height: '100%',
          }}
        >
          {Array.from({ length: BOARD_GRID * BOARD_GRID }).map((_, idx) => {
            const row = Math.floor(idx / BOARD_GRID);
            const col = idx % BOARD_GRID;
            const key = `${row}-${col}`;
            return (
              <BoardCell
                key={key}
                row={row}
                col={col}
                pieces={piecePositions.get(key) || []}
                isSafe={isSafeCell(row, col)}
                isCenter={isCenterCell(row, col)}
                homezoneColor={getHomezoneColor(row, col)}
                homeStretchColor={getHomeStretchColor(row, col)}
                selectedPieceId={selectedPieceId}
                animatingPieceId={animatingPieceId}
                theme={theme}
                pawnStyle={pawnStyleId}
                homeLayout={theme.homeLayout}

                onPieceClick={handlePieceClick}
              />
            );
          })}
        </div>

        {/* Home zone overlays — outside the overflow:hidden grid so clicks work */}
        {(['red','green','yellow','blue'] as PlayerColor[]).map(color => {
          const HOME_ANCHORS: Record<PlayerColor, { row: number; col: number }> = {
            red:    { row: 1, col: 1  },
            green:  { row: 1, col: 10 },
            yellow: { row: 10, col: 10 },
            blue:   { row: 10, col: 1 },
          };
          const anchor = HOME_ANCHORS[color];
          const homePieces = piecePositions.get(`${anchor.row}-${anchor.col}`) || [];
          if (theme.homeLayout === 'single-box') return null; // single-box uses grid rendering
          return (
            <HomeZoneOverlay
              key={color}
              color={color}
              cellPct={cellPct}
              pieces={homePieces}
              theme={theme}
              pawnStyle={pawnStyleId}
              selectedPieceId={selectedPieceId}
              animatingPieceId={animatingPieceId}
              onPieceClick={handlePieceClick}
            />
          );
        })}

        {/* Center triangle overlay — absolute on top of grid */}
        <div
          style={{
            position: 'absolute',
            left:   `${cellPct * 6}%`,
            top:    `${cellPct * 6}%`,
            width:  `${cellPct * 3}%`,
            height: `${cellPct * 3}%`,
            pointerEvents: 'none',
            zIndex: 15,
          }}
        >
          <CenterOverlay theme={theme} />
        </div>

        {/* Finished pieces overlay — one token per color in its wedge, with count badge */}
        {(() => {
          const finishedPieces = piecePositions.get('finished') ?? [];
          if (finishedPieces.length === 0) return null;

          // Group by color
          const byColor = new Map<PlayerColor, number>();
          for (const p of finishedPieces) {
            byColor.set(p.color, (byColor.get(p.color) ?? 0) + 1);
          }

          // Wedge centroids (as fraction of the 3-cell center zone)
          // red=left, green=top, yellow=right, blue=bottom
          const wedgeOffset: Record<PlayerColor, { x: number; y: number }> = {
            red:    { x: 0.22, y: 0.50 },
            green:  { x: 0.50, y: 0.22 },
            yellow: { x: 0.78, y: 0.50 },
            blue:   { x: 0.50, y: 0.78 },
          };
          const zoneSize = cellPct * 3;

          return (
            <>
              {Array.from(byColor.entries()).map(([color, count]) => {
                const wo = wedgeOffset[color];
                const left = cellPct * 6 + wo.x * zoneSize - cellPct * 0.5;
                const top  = cellPct * 6 + wo.y * zoneSize - cellPct * 0.5;
                // Pick any pieceId for this color to use as key
                const pieceId = finishedPieces.find(p => p.color === color)!.pieceId;
                return (
                  <div
                    key={color}
                    style={{
                      position: 'absolute',
                      left:   `${left}%`,
                      top:    `${top}%`,
                      width:  `${cellPct}%`,
                      height: `${cellPct}%`,
                      zIndex: 30,
                      pointerEvents: 'none',
                    }}
                  >
                    <PieceToken
                      key={pieceId}
                      pieceId={pieceId}
                      color={color}
                      isMovable={false}
                      isSelected={false}
                      isAnimating={false}
                      size="normal"
                      offsetX={0}
                      offsetY={0}
                      pawnStyle={pawnStyleId}
                      onClick={() => {}}
                    />
                    {count > 1 && (() => {
                      const cfg = COLOR_CONFIG[color];
                      return (
                        <div style={{
                          position: 'absolute',
                          top: '-4%', right: '-4%',
                          background: cfg.dark,
                          color: '#fff',
                          borderRadius: '50%',
                          width: '52%', height: '52%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 'clamp(7px, 1.4vw, 12px)', fontWeight: 600,
                          lineHeight: 1,
                          zIndex: 35,
                        }}>
                          {count}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </>
          );
        })()}
      </div>
    </div>
  );
}
