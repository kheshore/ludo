// ============================================================
// Ludo – Theme Store (persisted to localStorage)
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BoardThemeId, PawnStyleId, DiceStyleId } from './themes';
import { BOARD_THEMES, DICE_STYLES, PAWN_STYLES } from './themes';

// Clean up all old versioned keys so Zustand never sees stale versioned state
if (typeof window !== 'undefined') {
  ['ludo-theme', 'ludo-theme-v1', 'ludo-theme-v2', 'ludo-theme-v3', 'ludo-theme-v4'].forEach(
    (key) => localStorage.removeItem(key),
  );
}

interface ThemeState {
  boardThemeId: BoardThemeId;
  pawnStyleId: PawnStyleId;
  diceStyleId: DiceStyleId;
  setBoardTheme: (id: BoardThemeId) => void;
  setPawnStyle: (id: PawnStyleId) => void;
  setDiceStyle: (id: DiceStyleId) => void;
}

const DEFAULTS = {
  boardThemeId: 'classic' as BoardThemeId,
  pawnStyleId:  'coin'    as PawnStyleId,
  diceStyleId:  'classic' as DiceStyleId,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setBoardTheme: (id) => set({ boardThemeId: id }),
      setPawnStyle:  (id) => set({ pawnStyleId: id }),
      setDiceStyle:  (id) => set({ diceStyleId: id }),
    }),
    {
      name: 'ludo-theme-v5',
      storage: createJSONStorage(() => localStorage),
      version: 0,
      migrate: (state: unknown) => state as ThemeState,
      // Validate rehydrated state — reset any invalid ids to defaults
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ThemeState>;
        return {
          ...current,
          boardThemeId: (p.boardThemeId && p.boardThemeId in BOARD_THEMES)
            ? p.boardThemeId : DEFAULTS.boardThemeId,
          pawnStyleId:  (p.pawnStyleId  && p.pawnStyleId  in PAWN_STYLES)
            ? p.pawnStyleId  : DEFAULTS.pawnStyleId,
          diceStyleId:  (p.diceStyleId  && p.diceStyleId  in DICE_STYLES)
            ? p.diceStyleId  : DEFAULTS.diceStyleId,
        };
      },
    },
  ),
);
