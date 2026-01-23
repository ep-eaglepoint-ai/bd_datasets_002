'use client';

import { GameState } from '@/types/game';
import { Cell } from './Cell';
import { getLegalMoves } from '@/utils/gameLogic';

interface GameBoardProps {
  gameState: GameState;
  onCellClick: (index: number) => void;
  legalMoves: number[];
}

/**
 * GameBoard component renders the 3x3 board with connecting lines.
 */
export function GameBoard({ gameState, onCellClick, legalMoves }: GameBoardProps) {
  const { board, currentPlayer, selectedPiece, status, phase, ruleVariants } = gameState;
  const isGameOver = status !== 'playing';

  return (
    <div className="relative p-4 sm:p-6 md:p-8">
      {/* SVG Lines connecting the cells */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 300 300"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Horizontal lines */}
        <line x1="50" y1="50" x2="250" y2="50" className="stroke-slate-600" strokeWidth="3" />
        <line x1="50" y1="150" x2="250" y2="150" className="stroke-slate-600" strokeWidth="3" />
        <line x1="50" y1="250" x2="250" y2="250" className="stroke-slate-600" strokeWidth="3" />
        
        {/* Vertical lines */}
        <line x1="50" y1="50" x2="50" y2="250" className="stroke-slate-600" strokeWidth="3" />
        <line x1="150" y1="50" x2="150" y2="250" className="stroke-slate-600" strokeWidth="3" />
        <line x1="250" y1="50" x2="250" y2="250" className="stroke-slate-600" strokeWidth="3" />
        
        {/* Diagonal lines (shown when diagonal movement is enabled) */}
        {ruleVariants.diagonalMovement && (
          <>
            <line x1="50" y1="50" x2="250" y2="250" className="stroke-purple-500/50" strokeWidth="2" strokeDasharray="8,4" />
            <line x1="250" y1="50" x2="50" y2="250" className="stroke-purple-500/50" strokeWidth="2" strokeDasharray="8,4" />
          </>
        )}
      </svg>

      {/* Board grid */}
      <div className="relative grid grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {board.map((cellValue, index) => (
          <Cell
            key={index}
            index={index}
            value={cellValue}
            isSelected={selectedPiece === index}
            isLegalMove={legalMoves.includes(index)}
            onClick={() => onCellClick(index)}
            disabled={isGameOver}
            currentPlayer={currentPlayer}
            phase={phase}
            diagonalMovement={ruleVariants.diagonalMovement}
          />
        ))}
      </div>
    </div>
  );
}
