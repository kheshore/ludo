'use client';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store-game';
import { useThemeStore } from '@/lib/store-theme';
import { DICE_STYLES } from '@/lib/themes';
import { COLOR_CONFIG, PlayerColor } from '@/lib/types';

const DICE_FACES: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

const ROLLING_DELAYS = [0.02, 0.07, 0.01, 0.05, 0.09, 0.03, 0.08, 0.04, 0.06];
const ROLLING_SHOW = [true, false, true, true, false, true, false, true, false];

interface Dice3DProps {
  onRoll: () => void;
  disabled?: boolean;
  currentColor?: PlayerColor;
}

export default function Dice3D({ onRoll, disabled, currentColor = 'red' }: Dice3DProps) {
  const { gameState, showDiceResult } = useGameStore();
  const { diceStyleId } = useThemeStore();
  const diceStyle = DICE_STYLES[diceStyleId];
  const dice = gameState?.dice;
  const isRolling = dice?.isRolling ?? false;
  const value = dice?.value ?? 1;
  const colorConfig = COLOR_CONFIG[currentColor];
  const btnRef = useRef<HTMLButtonElement>(null);

  const dotColorNormal = diceStyle.dotColor;
  const dotColorSix =
    diceStyle.dotColorSix === 'player' ? colorConfig.hex : diceStyle.dotColorSix;

  return (
    <div className="flex flex-col items-center gap-3 relative">
      <motion.button
        ref={btnRef}
        onClick={onRoll}
        disabled={disabled || isRolling}
        className="relative w-20 h-20 cursor-pointer select-none touch-manipulation"
        style={{
          background: diceStyle.bodyBg,
          borderRadius: diceStyle.bodyRadius,
          boxShadow: isRolling
            ? diceStyle.bodyRollingGlow.replace('{glow}', colorConfig.glow)
            : showDiceResult && value === 6
            ? `0 0 20px ${colorConfig.glow}, 0 4px 16px rgba(0,0,0,0.2)`
            : diceStyle.bodyShadow,
        }}
        whileTap={!disabled && !isRolling ? { scale: 0.9 } : undefined}
        animate={
          isRolling
            ? {
                rotate: [0, 90, 180, 270, 360, 450, 540],
                scale: [1, 1.1, 0.95, 1.1, 0.95, 1.05, 1],
                y: [0, -20, 0, -15, 0, -8, 0],
              }
            : { rotate: 0, scale: 1, y: 0 }
        }
        transition={
          isRolling
            ? { duration: 0.7, ease: 'easeOut' }
            : { type: 'spring', stiffness: 300, damping: 20 }
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isRolling ? 'rolling' : value}
            className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-3 gap-0.5"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            {isRolling
              ? ROLLING_DELAYS.map((delay, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center justify-center"
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.15, repeat: Infinity, delay }}
                  >
                    {ROLLING_SHOW[i] && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: dotColorSix }}
                      />
                    )}
                  </motion.div>
                ))
              : Array.from({ length: 9 }).map((_, i) => {
                  const row = Math.floor(i / 3);
                  const col = i % 3;
                  const isDot = DICE_FACES[value]?.some(
                    ([r, c]) => r === row && c === col
                  );
                  return (
                    <div key={i} className="flex items-center justify-center">
                      {isDot && (
                        <motion.div
                          className="w-3.5 h-3.5 rounded-full shadow-sm"
                          style={{
                            backgroundColor: value === 6 ? dotColorSix : dotColorNormal,
                            boxShadow:
                              value === 6
                                ? `0 0 6px ${colorConfig.glow}`
                                : diceStyle.dotShadow,
                          }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            delay: 0.05 * (row + col),
                          }}
                        />
                      )}
                    </div>
                  );
                })}
          </motion.div>
        </AnimatePresence>

        {diceStyle.shine && (
          <div
            className="absolute inset-0 pointer-events-none dice-shine"
            style={{ borderRadius: diceStyle.bodyRadius }}
          />
        )}
      </motion.button>

      <AnimatePresence>
        {!disabled && !isRolling && dice?.canRoll && (
          <motion.p
            className="text-xs font-medium"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 0.6, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ color: colorConfig.hex }}
          >
            Tap to roll
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDiceResult && value === 6 && (
          <motion.div
            className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: colorConfig.hex }}
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
          >
            6! 🎉
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
