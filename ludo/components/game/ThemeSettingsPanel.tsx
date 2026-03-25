'use client';

// ============================================================
// ThemeSettingsPanel – Board & Pawn style selector
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '@/lib/store-theme';
import { BOARD_THEMES, PAWN_STYLES, DICE_STYLES, BoardThemeId, PawnStyleId, DiceStyleId } from '@/lib/themes';
import { COLOR_CONFIG } from '@/lib/types';

// ── Mini board-theme preview swatch ──────────────────────────
function BoardThemeSwatch({ id, selected, onClick }: { id: BoardThemeId; selected: boolean; onClick: () => void }) {
  const t = BOARD_THEMES[id];
  return (
    <button
      onClick={onClick}
      style={{
        background: t.boardBg,
        border: selected ? `2.5px solid #fff` : `2px solid transparent`,
        borderRadius: 10,
        padding: 4,
        outline: selected ? '2px solid rgba(255,255,255,0.4)' : 'none',
        outlineOffset: 2,
        cursor: 'pointer',
        transition: 'all 0.18s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {/* Mini Ludo grid preview: 5×5 blocks showing corner colors + white center strip */}
      <div style={{ width: 52, height: 52, display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gridTemplateRows: '2fr 1fr 2fr', gap: 1, borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ background: t.homeRed,    borderRadius: '4px 0 0 0' }} />
        <div style={{ background: t.trackBg }} />
        <div style={{ background: t.homeGreen,  borderRadius: '0 4px 0 0' }} />
        <div style={{ background: t.trackBg }} />
        <div style={{ background: t.centerBg }} />
        <div style={{ background: t.trackBg }} />
        <div style={{ background: t.homeBlue,   borderRadius: '0 0 0 4px' }} />
        <div style={{ background: t.trackBg }} />
        <div style={{ background: t.homeYellow, borderRadius: '0 0 4px 0' }} />
      </div>
      <span style={{ fontSize: 10, color: '#fff', fontWeight: selected ? 700 : 400, opacity: selected ? 1 : 0.7, letterSpacing: 0.2 }}>
        {t.emoji} {t.name}
      </span>
    </button>
  );
}

// ── Pawn style mini-preview ───────────────────────────────────
function PawnPreview({ id, selected, onClick }: { id: PawnStyleId; selected: boolean; onClick: () => void }) {
  const style = PAWN_STYLES[id];
  const color = '#ef4444'; // always show red as sample
  const dark  = COLOR_CONFIG.red.dark;
  const light = COLOR_CONFIG.red.light;

  const renderPawn = () => {
    if (id === 'coin') return (
      <div style={{ width: 32, height: 32, position: 'relative' }}>
        {/* Rim */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle at 40% 35%, ${dark}, ${dark}cc)`, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.45)' }} />
        {/* Face */}
        <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: `radial-gradient(circle at 38% 32%, ${light} 0%, ${color} 45%, ${dark} 100%)` }} />
        {/* Dot */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 8, height: 8, borderRadius: '50%', background: `radial-gradient(circle at 40% 35%, ${light}, ${color})` }} />
        {/* Specular */}
        <div style={{ position: 'absolute', top: 5, left: 6, width: 6, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', filter: 'blur(1px)', transform: 'rotate(-30deg)' }} />
      </div>
    );

    if (id === 'flat') return (
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, border: `3px solid ${dark}`, boxShadow: `0 2px 6px rgba(0,0,0,0.35)` }} />
    );

    if (id === 'crystal') return (
      <div style={{ width: 32, height: 32, position: 'relative', borderRadius: '50%', overflow: 'hidden', background: `conic-gradient(from 0deg, ${dark}, ${color}, ${light}, ${color}, ${dark})`, boxShadow: `0 0 10px ${color}88, inset 0 1px 4px rgba(255,255,255,0.5)` }}>
        {/* Facet lines */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '20%', left: '20%', width: '25%', height: '25%', borderRadius: '50%', background: 'rgba(255,255,255,0.7)', filter: 'blur(2px)' }} />
      </div>
    );
    return null;
  };

  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
        border: selected ? '2px solid rgba(255,255,255,0.7)' : '2px solid transparent',
        borderRadius: 12,
        padding: '10px 8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.18s',
        outline: selected ? '2px solid rgba(255,255,255,0.25)' : 'none',
        outlineOffset: 2,
      }}
    >
      {renderPawn()}
      <span style={{ fontSize: 10, color: '#fff', fontWeight: selected ? 700 : 400, opacity: selected ? 1 : 0.65 }}>
        {style.emoji} {style.name}
      </span>
    </button>
  );
}

// ── Dice style mini-preview ──────────────────────────────────
function DiceStylePreview({ id, selected, onClick }: { id: DiceStyleId; selected: boolean; onClick: () => void }) {
  const ds = DICE_STYLES[id];
  // 4-dot face preview
  const dotPositions = [[1, 1], [5, 5], [1, 5], [5, 1]] as const;
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
        border: selected ? '2px solid rgba(255,255,255,0.7)' : '2px solid transparent',
        borderRadius: 12,
        padding: '10px 8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.18s',
        outline: selected ? '2px solid rgba(255,255,255,0.25)' : 'none',
        outlineOffset: 2,
      }}
    >
      {/* Mini dice face */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: ds.bodyRadius,
          background: ds.bodyBg,
          boxShadow: ds.bodyShadow,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {dotPositions.map(([top, left], i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: top + 3,
              left: left + 3,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: ds.dotColor,
              boxShadow: ds.dotShadow,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 10, color: '#fff', fontWeight: selected ? 700 : 400, opacity: selected ? 1 : 0.65 }}>
        {ds.emoji} {ds.name}
      </span>
    </button>
  );
}

// ── Main panel ───────────────────────────────────────────────
interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThemeSettingsPanel({ isOpen, onClose }: Props) {
  const { boardThemeId, pawnStyleId, diceStyleId, setBoardTheme, setPawnStyle, setDiceStyle } = useThemeStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
              background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1f 100%)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px 20px 0 0',
              padding: '0 0 env(safe-area-inset-bottom, 16px)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 4px' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>🎨 Customize</span>
              <button
                onClick={onClose}
                style={{ color: 'rgba(255,255,255,0.45)', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Board Themes */}
            <div style={{ padding: '12px 20px 4px' }}>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Board Theme
              </p>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map(id => (
                  <BoardThemeSwatch
                    key={id}
                    id={id}
                    selected={boardThemeId === id}
                    onClick={() => setBoardTheme(id)}
                  />
                ))}
              </div>
            </div>

            {/* Pawn Styles */}
            <div style={{ padding: '12px 20px 4px' }}>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Pawn Style
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {(Object.keys(PAWN_STYLES) as PawnStyleId[]).map(id => (
                  <PawnPreview
                    key={id}
                    id={id}
                    selected={pawnStyleId === id}
                    onClick={() => setPawnStyle(id)}
                  />
                ))}
              </div>
            </div>

            {/* Dice Styles */}
            <div style={{ padding: '12px 20px 20px' }}>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Dice Style
              </p>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {(Object.keys(DICE_STYLES) as DiceStyleId[]).map(id => (
                  <DiceStylePreview
                    key={id}
                    id={id}
                    selected={diceStyleId === id}
                    onClick={() => setDiceStyle(id)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
