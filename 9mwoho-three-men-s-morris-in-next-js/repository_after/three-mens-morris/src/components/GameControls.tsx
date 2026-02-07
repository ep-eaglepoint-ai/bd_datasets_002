'use client';

import { RuleVariants } from '@/types/game';

interface GameControlsProps {
  ruleVariants: RuleVariants;
  onReset: () => void;
  onToggleDiagonalMovement: () => void;
  onToggleDiagonalWin: () => void;
  isGameOver: boolean;
}

/**
 * GameControls component provides reset and rule toggle controls.
 */
export function GameControls({
  ruleVariants,
  onReset,
  onToggleDiagonalMovement,
  onToggleDiagonalWin,
  isGameOver,
}: GameControlsProps) {
  return (
    <div className="w-full max-w-md space-y-4">
      {/* Reset button */}
      <button
        onClick={onReset}
        className={`
          w-full py-3 px-6 rounded-xl
          font-semibold text-lg
          transition-all duration-300
          ${isGameOver
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/25'
            : 'bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600'
          }
        `}
        data-testid="reset-button"
      >
        {isGameOver ? '🎮 Play Again' : '🔄 Reset Game'}
      </button>

      {/* Rule toggles */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Rule Variants</h3>
        
        {/* Diagonal Movement Toggle */}
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 group-hover:text-slate-200 transition-colors">
              Diagonal Movement
            </span>
            <span className="text-xs text-purple-400 px-2 py-0.5 bg-purple-500/10 rounded">
              Advanced
            </span>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={ruleVariants.diagonalMovement}
              onChange={onToggleDiagonalMovement}
              className="sr-only peer"
              data-testid="toggle-diagonal-movement"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
          </div>
        </label>

        {/* Diagonal Win Toggle */}
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 group-hover:text-slate-200 transition-colors">
              Diagonal Wins
            </span>
            <span className="text-xs text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded">
              Classic
            </span>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={ruleVariants.diagonalWin}
              onChange={onToggleDiagonalWin}
              className="sr-only peer"
              data-testid="toggle-diagonal-win"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </div>
        </label>

        <p className="text-xs text-slate-500 mt-2">
          Diagonal movement allows pieces to move to diagonally adjacent cells (corners ↔ center).
        </p>
      </div>
    </div>
  );
}
