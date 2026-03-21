'use client';

// ============================================================
// GameScreen - Main game view with board, dice, and player panels
// ============================================================

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LudoBoard from './LudoBoard';
import Dice3D from './Dice3D';
import PlayerPanel from './PlayerPanel';
import { useGameStore } from '@/lib/store-game';
import { useAuthStore } from '@/lib/store-auth';
import { COLOR_CONFIG } from '@/lib/types';

export default function GameScreen() {
  const { gameState, rollGameDice, resetGame } = useGameStore();
  const room = useGameStore(s => s.room);
  const { user, updateStats } = useAuthStore();
  const [autoRoll, setAutoRoll] = useState(false);

  const isMultiplayer = !!room;
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.userId === user?.id;
  const myPlayer = gameState?.players.find(p => p.userId === user?.id);
  const colorConfig = currentPlayer ? COLOR_CONFIG[currentPlayer.color] : COLOR_CONFIG.red;

  // Multiplayer: poll game state every 1.5s
  useEffect(() => {
    if (!isMultiplayer || !room?.code) return;
    const interval = setInterval(() => {
      useGameStore.getState().pollGameState(room.code);
    }, 1500);
    return () => clearInterval(interval);
  }, [isMultiplayer, room?.code]);

  // Auto-trigger bot turns on mount if bot goes first (local quick play only)
  useEffect(() => {
    if (!isMultiplayer && gameState?.phase === 'playing' && currentPlayer?.isBot) {
      const timeout = setTimeout(() => {
        useGameStore.getState().executeBotTurn();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-roll dice when it's the player's turn
  useEffect(() => {
    if (autoRoll && isMyTurn && gameState?.dice.canRoll && !gameState?.dice.isRolling && gameState?.phase === 'playing') {
      const timeout = setTimeout(() => {
        useGameStore.getState().rollGameDice(user?.id);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [autoRoll, isMyTurn, gameState?.dice.canRoll, gameState?.dice.isRolling, gameState?.phase, user?.id]);

  // Update stats and record game history when game finishes
  useEffect(() => {
    if (gameState?.phase === 'finished' && myPlayer && user) {
      const isWinner = gameState.winner === myPlayer.id;
      void updateStats({
        gamesPlayed: user.stats.gamesPlayed + 1,
        gamesWon: user.stats.gamesWon + (isWinner ? 1 : 0),
        gamesLost: user.stats.gamesLost + (isWinner ? 0 : 1),
        winStreak: isWinner ? user.stats.winStreak + 1 : 0,
        bestWinStreak: isWinner
          ? Math.max(user.stats.bestWinStreak, user.stats.winStreak + 1)
          : user.stats.bestWinStreak,
        firstPlaceFinishes: user.stats.firstPlaceFinishes + (myPlayer.finishOrder === 1 ? 1 : 0),
        secondPlaceFinishes: user.stats.secondPlaceFinishes + (myPlayer.finishOrder === 2 ? 1 : 0),
        thirdPlaceFinishes: user.stats.thirdPlaceFinishes + (myPlayer.finishOrder === 3 ? 1 : 0),
        fourthPlaceFinishes: user.stats.fourthPlaceFinishes + (myPlayer.finishOrder === 4 ? 1 : 0),
      });

      // Record game history
      const historyPlayers = gameState.players.map(p => ({
        userId: p.userId || p.id,
        nickname: p.nickname,
        slug: p.slug || '',
        color: p.color,
        isBot: p.isBot,
        finishOrder: p.finishOrder || 0,
      }));

      fetch('/api/game-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: room?.code || '',
          players: historyPlayers,
          playerCount: gameState.players.length,
          startedAt: gameState.createdAt || Date.now(),
          endedAt: Date.now(),
          duration: gameState.createdAt
            ? Math.floor((Date.now() - gameState.createdAt) / 1000)
            : 0,
        }),
      }).catch(() => { /* ignore */ });
    }
  }, [gameState?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!gameState) return null;

  const canRoll = isMyTurn && gameState.dice.canRoll && !gameState.dice.isRolling;

  return (
    <div className="flex flex-col h-full bg-linear-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <button
          onClick={() => {
            if (isMultiplayer && user) {
              useGameStore.getState().leaveRoom(user.id);
            }
            resetGame();
          }}
          className="text-white/50 hover:text-white text-sm flex items-center gap-1 transition-colors"
        >
          ← Leave
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: colorConfig.hex }}
          />
          <span className="text-sm text-white/70 font-medium">
            {currentPlayer?.nickname}&apos;s turn
          </span>
        </div>
        <div className="text-white/30 text-xs">
          Turn {gameState.turnHistory.length + 1}
        </div>
      </div>

      {/* Players - Top */}
      <div className="grid grid-cols-2 gap-2 px-3 py-2">
        {gameState.players.slice(0, 2).map(player => (
          <PlayerPanel
            key={player.id}
            player={player}
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(player)}
            isUser={player.userId === user?.id}
          />
        ))}
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center px-2">
        <LudoBoard />
      </div>

      {/* Players - Bottom */}
      <div className="grid grid-cols-2 gap-2 px-3 py-2">
        {gameState.players.slice(2).map(player => (
          <PlayerPanel
            key={player.id}
            player={player}
            isCurrentTurn={gameState.currentPlayerIndex === gameState.players.indexOf(player)}
            isUser={player.userId === user?.id}
          />
        ))}
      </div>

      {/* Dice & Controls */}
      <div className="flex items-center justify-center gap-4 px-4 py-4 border-t border-white/5">
        <Dice3D
          onRoll={() => rollGameDice(user?.id)}
          disabled={!canRoll}
          currentColor={currentPlayer?.color}
        />
        <button
          onClick={() => setAutoRoll(prev => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            autoRoll
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-white/5 text-white/30 border border-white/10 hover:text-white/50'
          }`}
        >
          <span className={`w-2 h-2 rounded-full transition-colors ${autoRoll ? 'bg-green-400' : 'bg-white/20'}`} />
          Auto
        </button>
      </div>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameState.phase === 'finished' && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-900 rounded-3xl p-8 mx-4 max-w-sm w-full text-center border border-white/10"
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                🏆
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Game Over!</h2>

              <div className="space-y-2 mt-6">
                {gameState.players
                  .sort((a, b) => a.finishOrder - b.finishOrder)
                  .map((player, i) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5"
                    >
                      <span className="text-lg">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '4️⃣'}
                      </span>
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLOR_CONFIG[player.color].hex }}
                      />
                      <span className="text-white text-sm font-medium flex-1 text-left">
                        {player.nickname}
                      </span>
                      {player.userId === user?.id && (
                        <span className="text-xs text-white/40">You</span>
                      )}
                    </div>
                  ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={resetGame}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/20 transition-colors"
                >
                  Back to Menu
                </button>
                <button
                  onClick={() => {
                    resetGame();
                    if (user) {
                      useGameStore.getState().startQuickGame(user.id, user.nickname, user.slug);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl text-white font-medium text-sm transition-colors"
                  style={{ backgroundColor: COLOR_CONFIG.red.hex }}
                >
                  Play Again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
