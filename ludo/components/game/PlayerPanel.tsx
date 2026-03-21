'use client';

// ============================================================
// PlayerPanel - Shows player info, turn indicator, pieces status
// ============================================================

import { motion } from 'framer-motion';
import { COLOR_CONFIG, Player } from '@/lib/types';

interface PlayerPanelProps {
  player: Player;
  isCurrentTurn: boolean;
  isUser: boolean;
}

export default function PlayerPanel({ player, isCurrentTurn, isUser }: PlayerPanelProps) {
  const config = COLOR_CONFIG[player.color];
  const homePieces = player.pieces.filter(p => p.state === 'home').length;
  const activePieces = player.pieces.filter(p => p.state === 'active').length;
  const finishedPieces = player.pieces.filter(p => p.state === 'finished').length;

  return (
    <motion.div
      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
        isCurrentTurn
          ? 'ring-2 bg-white/10'
          : 'bg-white/5'
      } ${player.hasFinished ? 'opacity-60' : ''}`}
      style={{
        boxShadow: isCurrentTurn ? `inset 0 0 0 2px ${config.hex}` : 'none',
      }}
      animate={isCurrentTurn ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 1.5, repeat: isCurrentTurn ? Infinity : 0 }}
    >
      {/* Color indicator */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg shrink-0"
        style={{
          backgroundColor: config.hex,
          boxShadow: isCurrentTurn ? `0 0 16px ${config.glow}` : `0 2px 8px rgba(0,0,0,0.3)`,
        }}
      >
        {player.isBot ? '🤖' : isUser ? '👤' : '🎮'}
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white truncate">
            {player.nickname}
          </span>
          {isUser && (
            <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded-full text-white/60">
              You
            </span>
          )}
          {player.hasFinished && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
              #{player.finishOrder}
            </span>
          )}
        </div>

        {/* Pieces status */}
        <div className="flex items-center gap-2 mt-0.5">
          {homePieces > 0 && (
            <span className="text-[10px] text-white/40">🏠{homePieces}</span>
          )}
          {activePieces > 0 && (
            <span className="text-[10px] text-white/60">🏃{activePieces}</span>
          )}
          {finishedPieces > 0 && (
            <span className="text-[10px] text-green-400">✅{finishedPieces}</span>
          )}
        </div>
      </div>

      {/* Turn indicator */}
      {isCurrentTurn && !player.hasFinished && (
        <motion.div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: config.hex }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}
