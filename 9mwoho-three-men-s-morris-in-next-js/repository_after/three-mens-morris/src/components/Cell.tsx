'use client';

import { CellValue, Player } from '@/types/game';
import { getLegalMoves, getAdjacentCells } from '@/utils/gameLogic';

interface CellProps {
  index: number;
  value: CellValue;
  isSelected: boolean;
  isLegalMove: boolean;
  onClick: () => void;
  disabled: boolean;
  currentPlayer: Player;
  phase: 'placement' | 'movement';
  diagonalMovement: boolean;
}

/**
 * Cell component represents a single position on the game board.
 * Shows pieces, selection state, and legal move hints.
 */
export function Cell({
  index,
  value,
  isSelected,
  isLegalMove,
  onClick,
  disabled,
  currentPlayer,
  phase,
}: CellProps) {
  // Determine cell styling based on state
  const baseClasses = `
    relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24
    rounded-xl
    flex items-center justify-center
    transition-all duration-200 ease-out
    cursor-pointer
    border-2
  `;

  const getStateClasses = () => {
    if (disabled) {
      return 'bg-slate-800/50 border-slate-700/50 cursor-not-allowed';
    }

    if (isSelected) {
      return value === 'X'
        ? 'bg-rose-500/20 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-105'
        : 'bg-blue-500/20 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-105';
    }

    if (isLegalMove) {
      return 'bg-emerald-500/20 border-emerald-400 hover:bg-emerald-500/30 hover:scale-105';
    }

    if (value) {
      return value === 'X'
        ? 'bg-slate-800 border-slate-600 hover:border-rose-400/50'
        : 'bg-slate-800 border-slate-600 hover:border-blue-400/50';
    }

    // Empty cell (can be played on in placement phase)
    if (phase === 'placement') {
      return currentPlayer === 'X'
        ? 'bg-slate-800 border-slate-600 hover:bg-rose-500/10 hover:border-rose-400/50 hover:scale-105'
        : 'bg-slate-800 border-slate-600 hover:bg-blue-500/10 hover:border-blue-400/50 hover:scale-105';
    }

    return 'bg-slate-800 border-slate-600';
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${getStateClasses()}`}
      aria-label={`Cell ${index}: ${value || 'empty'}${isSelected ? ' (selected)' : ''}${isLegalMove ? ' (legal move)' : ''}`}
      data-testid={`cell-${index}`}
    >
      {/* Piece display */}
      {value && (
        <div
          className={`
            w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14
            rounded-full
            flex items-center justify-center
            text-2xl sm:text-3xl md:text-4xl font-bold
            transition-all duration-300
            ${value === 'X'
              ? 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]'
              : 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
            }
            ${isSelected ? 'animate-pulse scale-110' : ''}
          `}
          data-testid={`piece-${value}`}
        >
          {value}
        </div>
      )}

      {/* Legal move indicator */}
      {isLegalMove && !value && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-400/40 border-2 border-emerald-400 animate-pulse" />
        </div>
      )}

      {/* Corner position indicator for debugging/education */}
      <span className="absolute bottom-1 right-2 text-[10px] text-slate-500 font-mono opacity-50">
        {index}
      </span>
    </button>
  );
}
