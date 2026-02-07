'use client';

import { useGameState } from '@/hooks/useGameState';
import { GameBoard, GameStatus, GameControls } from '@/components';

/**
 * Three Men's Morris - Main Game Page
 * 
 * An ancient strategy board game for two players. Each player has three pieces
 * that they must first place on the board, then move to adjacent positions
 * to form a line of three and win.
 */
export default function Home() {
  const {
    gameState,
    handleCellClick,
    resetGame,
    toggleDiagonalMovement,
    toggleDiagonalWin,
    getSelectedPieceLegalMoves,
  } = useGameState();

  const legalMoves = getSelectedPieceLegalMoves();
  const isGameOver = gameState.status !== 'playing';

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Header */}
      <header className="text-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-rose-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
          Three Men&apos;s Morris
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Ancient Strategy Board Game
        </p>
      </header>

      {/* Game Status */}
      <GameStatus gameState={gameState} />

      {/* Game Board */}
      <div className="my-6 sm:my-8 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-2xl shadow-black/50">
        <GameBoard
          gameState={gameState}
          onCellClick={handleCellClick}
          legalMoves={legalMoves}
        />
      </div>

      {/* Game Controls */}
      <GameControls
        ruleVariants={gameState.ruleVariants}
        onReset={resetGame}
        onToggleDiagonalMovement={toggleDiagonalMovement}
        onToggleDiagonalWin={toggleDiagonalWin}
        isGameOver={isGameOver}
      />

      {/* Game Instructions (collapsible on mobile) */}
      <details className="mt-6 sm:mt-8 w-full max-w-md text-slate-400 text-sm">
        <summary className="cursor-pointer hover:text-slate-200 transition-colors">
          📖 How to Play
        </summary>
        <div className="mt-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2">
          <p><strong className="text-slate-200">Placement Phase:</strong> Players take turns placing their 3 pieces on empty positions.</p>
          <p><strong className="text-slate-200">Movement Phase:</strong> Once all pieces are placed, players move their pieces to adjacent empty positions.</p>
          <p><strong className="text-slate-200">Winning:</strong> Form a line of 3 pieces (horizontal, vertical, or diagonal if enabled).</p>
        </div>
      </details>

      {/* Footer */}
      <footer className="mt-8 text-center text-slate-500 text-xs">
        <p>An educational implementation of the historical Three Men&apos;s Morris game</p>
      </footer>
    </main>
  );
}
