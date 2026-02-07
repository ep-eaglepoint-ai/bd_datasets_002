'use client';

import { GameState } from '@/types/game';

interface GameStatusProps {
  gameState: GameState;
}

/**
 * GameStatus component displays current player, phase, and game status.
 */
export function GameStatus({ gameState }: GameStatusProps) {
  const { currentPlayer, phase, status, winner, piecesPlaced, message } = gameState;

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Status message */}
      <div
        className={`
          text-center text-lg sm:text-xl font-semibold p-4 rounded-xl
          transition-all duration-300
          ${status === 'won'
            ? winner === 'X'
              ? 'bg-gradient-to-r from-rose-500/20 to-rose-600/20 text-rose-300 border border-rose-500/30'
              : 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border border-blue-500/30'
            : status === 'draw'
              ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border border-amber-500/30'
              : 'bg-slate-800/50 text-slate-200 border border-slate-700'
          }
        `}
        data-testid="game-message"
      >
        {message}
      </div>

      {/* Game info grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Current Player indicator */}
        <div
          className={`
            p-3 rounded-xl text-center transition-all duration-300
            ${status === 'playing'
              ? currentPlayer === 'X'
                ? 'bg-rose-500/10 border border-rose-500/30'
                : 'bg-blue-500/10 border border-blue-500/30'
              : 'bg-slate-800/50 border border-slate-700'
            }
          `}
          data-testid="current-player"
        >
          <div className="text-xs text-slate-400 mb-1">Current</div>
          <div
            className={`
              text-2xl font-bold
              ${currentPlayer === 'X' ? 'text-rose-400' : 'text-blue-400'}
            `}
          >
            {currentPlayer}
          </div>
        </div>

        {/* Phase indicator */}
        <div
          className="p-3 rounded-xl text-center bg-slate-800/50 border border-slate-700"
          data-testid="game-phase"
        >
          <div className="text-xs text-slate-400 mb-1">Phase</div>
          <div className="text-sm font-semibold text-slate-200 capitalize">
            {phase}
          </div>
        </div>

        {/* Pieces count */}
        <div className="p-3 rounded-xl text-center bg-slate-800/50 border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Pieces</div>
          <div className="flex justify-center gap-2 text-sm font-semibold">
            <span className="text-rose-400">{piecesPlaced.X}/3</span>
            <span className="text-slate-500">|</span>
            <span className="text-blue-400">{piecesPlaced.O}/3</span>
          </div>
        </div>
      </div>
    </div>
  );
}
