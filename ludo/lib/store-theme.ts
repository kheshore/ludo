// ============================================================
// Ludo – Theme Store (persisted to localStorage)
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BoardThemeId, PawnStyleId, DiceStyleId } from './themes';
import { BOARD_THEMES, DICE_STYLES, PAWN_STYLES } from './themes';
import { soundManager } from './sounds';

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
  soundEnabled: boolean;
  volume: number; // 0–1
  setBoardTheme: (id: BoardThemeId) => void;
  setPawnStyle: (id: PawnStyleId) => void;
  setDiceStyle: (id: DiceStyleId) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setVolume: (vol: number) => void;
}

const DEFAULTS = {
  boardThemeId: 'classic' as BoardThemeId,
  pawnStyleId:  'coin'    as PawnStyleId,
  diceStyleId:  'classic' as DiceStyleId,
  soundEnabled: true,
  volume: 0.6,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setBoardTheme: (id) => set({ boardThemeId: id }),
      setPawnStyle:  (id) => set({ pawnStyleId: id }),
      setDiceStyle:  (id) => set({ diceStyleId: id }),
      setSoundEnabled: (enabled) => {
        soundManager.setEnabled(enabled);
        set({ soundEnabled: enabled });
      },
      setVolume: (vol) => {
        soundManager.setVolume(vol);
        set({ volume: vol });
      },
    }),
    {
      name: 'ludo-theme-v5',
      storage: createJSONStorage(() => localStorage),
      version: 0,
      migrate: (state: unknown) => state as ThemeState,
      // Validate rehydrated state — reset any invalid ids to defaults
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ThemeState>;
        const soundEnabled = p.soundEnabled ?? DEFAULTS.soundEnabled;
        const volume = typeof p.volume === 'number' ? Math.max(0, Math.min(1, p.volume)) : DEFAULTS.volume;
        // Sync sound manager with persisted state
        soundManager.setEnabled(soundEnabled);
        soundManager.setVolume(volume);
        return {
          ...current,
          boardThemeId: (p.boardThemeId && p.boardThemeId in BOARD_THEMES)
            ? p.boardThemeId : DEFAULTS.boardThemeId,
          pawnStyleId:  (p.pawnStyleId  && p.pawnStyleId  in PAWN_STYLES)
            ? p.pawnStyleId  : DEFAULTS.pawnStyleId,
          diceStyleId:  (p.diceStyleId  && p.diceStyleId  in DICE_STYLES)
            ? p.diceStyleId  : DEFAULTS.diceStyleId,
          soundEnabled,
          volume,
        };
      },
    },
  ),
);
