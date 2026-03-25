// ============================================================
// Ludo – Board & Pawn Theme Definitions
// ============================================================

export type BoardThemeId = 'classic' | 'wood' | 'neon' | 'ocean' | 'debug';
export type PawnStyleId  = 'coin' | 'flat' | 'crystal';
export type HomeLayout   = 'four-slot' | 'single-box';

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  emoji: string;
  // optional features
  showNumbers: boolean;   // show track position numbers on each cell
  homeLayout: HomeLayout; // 'four-slot' = 4 circles | 'single-box' = one big box
  // track / white cells
  trackBg: string;
  trackBorder: string;
  trackSafeMarker: string;
  // home-zone outer ring
  homeRed: string;
  homeGreen: string;
  homeYellow: string;
  homeBlue: string;
  // home-zone inner white box
  homeInnerBg: string;
  homeInnerBorder: string;
  // home-stretch lanes
  stretchRed: string;
  stretchGreen: string;
  stretchYellow: string;
  stretchBlue: string;
  // center cell (behind the SVG triangles)
  centerBg: string;
  // board outer shell
  boardBorder: string;
  boardShadow: string;
  boardRadius: number;
  // overall board background (used under the grid)
  boardBg: string;
}

export const BOARD_THEMES: Record<BoardThemeId, BoardTheme> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    emoji: '♟️',
    showNumbers: false,
    homeLayout: 'four-slot',
    trackBg: '#ffffff',
    trackBorder: 'rgba(0,0,0,0.13)',
    trackSafeMarker: 'rgba(100,100,100,0.30)',
    homeRed: '#ef4444',
    homeGreen: '#22c55e',
    homeYellow: '#eab308',
    homeBlue: '#3b82f6',
    homeInnerBg: '#ffffff',
    homeInnerBorder: 'rgba(0,0,0,0.10)',
    stretchRed: '#ef4444',
    stretchGreen: '#22c55e',
    stretchYellow: '#eab308',
    stretchBlue: '#3b82f6',
    centerBg: '#f5f5f5',
    boardBorder: 'rgba(0,0,0,0.30)',
    boardShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
    boardRadius: 8,
    boardBg: '#fff',
  },
  wood: {
    id: 'wood',
    name: 'Wood',
    emoji: '🪵',
    showNumbers: false,
    homeLayout: 'four-slot',
    trackBg: '#f5e6c8',
    trackBorder: '#c8a96a',
    trackSafeMarker: 'rgba(120,80,20,0.35)',
    homeRed: '#c0392b',
    homeGreen: '#1e8449',
    homeYellow: '#b7950b',
    homeBlue: '#1a5276',
    homeInnerBg: '#fdf3dc',
    homeInnerBorder: '#c8a96a',
    stretchRed: '#c0392b',
    stretchGreen: '#1e8449',
    stretchYellow: '#b7950b',
    stretchBlue: '#1a5276',
    centerBg: '#deb887',
    boardBorder: '#7d5533',
    boardShadow: '0 8px 32px rgba(60,30,5,0.6), 0 2px 12px rgba(80,40,10,0.4)',
    boardRadius: 12,
    boardBg: '#8b5e3c',
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    emoji: '⚡',
    showNumbers: false,
    homeLayout: 'four-slot',
    trackBg: '#0f0f1a',
    trackBorder: 'rgba(255,255,255,0.08)',
    trackSafeMarker: 'rgba(255,255,255,0.20)',
    homeRed: '#ff2050',
    homeGreen: '#00ff88',
    homeYellow: '#ffe000',
    homeBlue: '#00aaff',
    homeInnerBg: '#1a1a2e',
    homeInnerBorder: 'rgba(255,255,255,0.12)',
    stretchRed: '#ff2050',
    stretchGreen: '#00ff88',
    stretchYellow: '#ffe000',
    stretchBlue: '#00aaff',
    centerBg: '#0d0d1a',
    boardBorder: 'rgba(120,80,255,0.5)',
    boardShadow: '0 0 40px rgba(120,80,255,0.4), 0 8px 32px rgba(0,0,0,0.8)',
    boardRadius: 8,
    boardBg: '#0a0a14',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    showNumbers: false,
    homeLayout: 'four-slot',
    trackBg: '#e8f4fd',
    trackBorder: '#a8d4f0',
    trackSafeMarker: 'rgba(30,100,180,0.25)',
    homeRed: '#e74c6f',
    homeGreen: '#1abc9c',
    homeYellow: '#f39c12',
    homeBlue: '#2980b9',
    homeInnerBg: '#d6eaf8',
    homeInnerBorder: '#a8d4f0',
    stretchRed: '#e74c6f',
    stretchGreen: '#1abc9c',
    stretchYellow: '#f39c12',
    stretchBlue: '#2980b9',
    centerBg: '#aed6f1',
    boardBorder: '#2471a3',
    boardShadow: '0 8px 32px rgba(30,100,180,0.4), 0 2px 12px rgba(0,0,0,0.3)',
    boardRadius: 10,
    boardBg: '#c9e8f8',
  },
  debug: {
    id: 'debug',
    name: 'Debug',
    emoji: '🔢',
    showNumbers: true,
    homeLayout: 'single-box',
    trackBg: '#f8f8f8',
    trackBorder: 'rgba(0,0,0,0.18)',
    trackSafeMarker: 'rgba(0,180,0,0.25)',
    homeRed: '#ef4444',
    homeGreen: '#22c55e',
    homeYellow: '#eab308',
    homeBlue: '#3b82f6',
    homeInnerBg: '#ffffff',
    homeInnerBorder: 'rgba(0,0,0,0.15)',
    stretchRed: '#fca5a5',
    stretchGreen: '#86efac',
    stretchYellow: '#fde047',
    stretchBlue: '#93c5fd',
    centerBg: '#f0f0f0',
    boardBorder: '#666',
    boardShadow: '0 4px 16px rgba(0,0,0,0.3)',
    boardRadius: 4,
    boardBg: '#e0e0e0',
  },
};

export interface PawnStyle {
  id: PawnStyleId;
  name: string;
  emoji: string;
  description: string;
}

export const PAWN_STYLES: Record<PawnStyleId, PawnStyle> = {
  coin: {
    id: 'coin',
    name: 'Coin',
    emoji: '🪙',
    description: 'Classic 3D coin with rim & gloss',
  },
  flat: {
    id: 'flat',
    name: 'Flat',
    emoji: '⬤',
    description: 'Simple flat circle — minimalist',
  },
  crystal: {
    id: 'crystal',
    name: 'Crystal',
    emoji: '💎',
    description: 'Faceted gem with inner glow',
  },
};

// ---- Dice styles ----

export type DiceStyleId = 'classic' | 'dark' | 'wood' | 'neon' | 'minimal';

export interface DiceStyle {
  id: DiceStyleId;
  name: string;
  emoji: string;
  // dice body
  bodyBg: string;          // background gradient or color
  bodyShadow: string;      // box-shadow on idle
  bodyRollingGlow: string; // extra glow while rolling (uses colorConfig.glow template)
  bodyRadius: string;      // border-radius
  // dots
  dotColor: string;        // normal dot color (non-6)
  dotColorSix: string;     // dot color on a 6 (use 'player' to inherit player color)
  dotShadow: string;       // box-shadow on dots (non-6)
  // shine overlay class
  shine: boolean;          // whether to show the dice-shine overlay
}

export const DICE_STYLES: Record<DiceStyleId, DiceStyle> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    emoji: '🎲',
    bodyBg: 'linear-gradient(145deg, #ffffff, #e6e6e6)',
    bodyShadow: '0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
    bodyRollingGlow: '0 0 30px {glow}, 0 8px 32px rgba(0,0,0,0.3)',
    bodyRadius: '16px',
    dotColor: '#1a1a1a',
    dotColorSix: 'player',
    dotShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
    shine: true,
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    emoji: '🖤',
    bodyBg: 'linear-gradient(145deg, #2a2a2a, #111111)',
    bodyShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
    bodyRollingGlow: '0 0 30px {glow}, 0 8px 32px rgba(0,0,0,0.6)',
    bodyRadius: '16px',
    dotColor: '#ffffff',
    dotColorSix: 'player',
    dotShadow: '0 0 4px rgba(255,255,255,0.4)',
    shine: false,
  },
  wood: {
    id: 'wood',
    name: 'Wood',
    emoji: '🪵',
    bodyBg: 'linear-gradient(145deg, #c8874a, #8b5e3c)',
    bodyShadow: '0 4px 16px rgba(60,30,5,0.45), inset 0 1px 0 rgba(255,200,120,0.3)',
    bodyRollingGlow: '0 0 24px rgba(200,135,74,0.6), 0 8px 32px rgba(60,30,5,0.5)',
    bodyRadius: '10px',
    dotColor: '#2a1a08',
    dotColorSix: '#ff8c00',
    dotShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
    shine: true,
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    emoji: '⚡',
    bodyBg: 'linear-gradient(145deg, #0f0f1f, #060610)',
    bodyShadow: '0 0 16px rgba(120,80,255,0.35), 0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(120,80,255,0.2)',
    bodyRollingGlow: '0 0 40px {glow}, 0 0 20px rgba(120,80,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
    bodyRadius: '12px',
    dotColor: '#7c3aed',
    dotColorSix: 'player',
    dotShadow: '0 0 6px rgba(124,58,237,0.8)',
    shine: false,
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    emoji: '⬜',
    bodyBg: '#f9f9f9',
    bodyShadow: '0 2px 8px rgba(0,0,0,0.10), inset 0 0 0 1.5px rgba(0,0,0,0.08)',
    bodyRollingGlow: '0 0 20px {glow}, 0 4px 16px rgba(0,0,0,0.15)',
    bodyRadius: '8px',
    dotColor: '#222222',
    dotColorSix: 'player',
    dotShadow: 'none',
    shine: false,
  },
};
