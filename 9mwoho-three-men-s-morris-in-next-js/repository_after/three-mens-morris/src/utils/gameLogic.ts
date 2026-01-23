/**
 * Three Men's Morris Game Logic Utilities
 * 
 * Pure functions for game logic including adjacency calculation,
 * win detection, and move validation.
 * 
 * Board Layout (indices 0-8):
 * 
 *   0 --- 1 --- 2
 *   |     |     |
 *   3 --- 4 --- 5
 *   |     |     |
 *   6 --- 7 --- 8
 */

import { CellValue, GameState, Player } from '@/types/game';

/**
 * Adjacency map for orthogonal (non-diagonal) movement.
 * Each key is a cell index, value is array of adjacent cell indices.
 */
const ORTHOGONAL_ADJACENCY: Record<number, number[]> = {
  0: [1, 3],
  1: [0, 2, 4],
  2: [1, 5],
  3: [0, 4, 6],
  4: [1, 3, 5, 7],
  5: [2, 4, 8],
  6: [3, 7],
  7: [4, 6, 8],
  8: [5, 7],
};

/**
 * Diagonal adjacency additions.
 * The center (4) can reach all corners, corners can reach center.
 */
const DIAGONAL_ADJACENCY: Record<number, number[]> = {
  0: [4],
  1: [],
  2: [4],
  3: [],
  4: [0, 2, 6, 8],
  5: [],
  6: [4],
  7: [],
  8: [4],
};

/**
 * Winning lines - horizontal, vertical, and diagonal patterns.
 */
const HORIZONTAL_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
];

const VERTICAL_LINES: number[][] = [
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
];

const DIAGONAL_LINES: number[][] = [
  [0, 4, 8],
  [2, 4, 6],
];

/**
 * Get all adjacent cells for a given position.
 * @param index - Cell index (0-8)
 * @param allowDiagonal - Whether to include diagonal adjacencies
 * @returns Array of adjacent cell indices
 */
export function getAdjacentCells(index: number, allowDiagonal: boolean = false): number[] {
  const orthogonal = ORTHOGONAL_ADJACENCY[index] || [];
  
  if (!allowDiagonal) {
    return orthogonal;
  }
  
  const diagonal = DIAGONAL_ADJACENCY[index] || [];
  return [...orthogonal, ...diagonal].sort((a, b) => a - b);
}

/**
 * Check if two cells are adjacent.
 * @param from - Source cell index
 * @param to - Target cell index
 * @param allowDiagonal - Whether to allow diagonal movement
 * @returns True if cells are adjacent
 */
export function areAdjacent(from: number, to: number, allowDiagonal: boolean = false): boolean {
  return getAdjacentCells(from, allowDiagonal).includes(to);
}

/**
 * Check if a player has won by forming a line of three.
 * @param board - Current board state
 * @param allowDiagonalWin - Whether diagonal lines count for winning
 * @returns The winning player or null if no winner
 */
export function checkWinner(board: CellValue[], allowDiagonalWin: boolean = true): Player | null {
  const linesToCheck = [...HORIZONTAL_LINES, ...VERTICAL_LINES];
  
  if (allowDiagonalWin) {
    linesToCheck.push(...DIAGONAL_LINES);
  }
  
  for (const line of linesToCheck) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }
  
  return null;
}

/**
 * Get all winning lines.
 * @param allowDiagonalWin - Whether to include diagonal lines
 * @returns Array of winning line patterns
 */
export function getWinningLines(allowDiagonalWin: boolean = true): number[][] {
  const lines = [...HORIZONTAL_LINES, ...VERTICAL_LINES];
  if (allowDiagonalWin) {
    lines.push(...DIAGONAL_LINES);
  }
  return lines;
}

/**
 * Check if a placement is valid.
 * @param state - Current game state
 * @param cellIndex - Target cell index
 * @returns True if placement is valid
 */
export function isValidPlacement(state: GameState, cellIndex: number): boolean {
  // Must be in placement phase
  if (state.phase !== 'placement') {
    return false;
  }
  
  // Game must be ongoing
  if (state.status !== 'playing') {
    return false;
  }
  
  // Cell index must be valid
  if (cellIndex < 0 || cellIndex > 8) {
    return false;
  }
  
  // Cell must be empty
  if (state.board[cellIndex] !== null) {
    return false;
  }
  
  return true;
}

/**
 * Check if a movement is valid.
 * @param state - Current game state
 * @param from - Source cell index
 * @param to - Target cell index
 * @returns True if movement is valid
 */
export function isValidMovement(state: GameState, from: number, to: number): boolean {
  // Must be in movement phase
  if (state.phase !== 'movement') {
    return false;
  }
  
  // Game must be ongoing
  if (state.status !== 'playing') {
    return false;
  }
  
  // Indices must be valid
  if (from < 0 || from > 8 || to < 0 || to > 8) {
    return false;
  }
  
  // Source must be current player's piece
  if (state.board[from] !== state.currentPlayer) {
    return false;
  }
  
  // Target must be empty
  if (state.board[to] !== null) {
    return false;
  }
  
  // Cells must be adjacent
  if (!areAdjacent(from, to, state.ruleVariants.diagonalMovement)) {
    return false;
  }
  
  return true;
}

/**
 * Get all legal moves for a piece at given position.
 * @param state - Current game state
 * @param pieceIndex - Index of the piece to move
 * @returns Array of valid target cell indices
 */
export function getLegalMoves(state: GameState, pieceIndex: number): number[] {
  if (state.phase !== 'movement' || state.status !== 'playing') {
    return [];
  }
  
  if (state.board[pieceIndex] !== state.currentPlayer) {
    return [];
  }
  
  const adjacent = getAdjacentCells(pieceIndex, state.ruleVariants.diagonalMovement);
  return adjacent.filter(index => state.board[index] === null);
}

/**
 * Check if the current player has any legal moves.
 * @param state - Current game state
 * @returns True if player has at least one legal move
 */
export function hasLegalMoves(state: GameState): boolean {
  if (state.status !== 'playing') {
    return false;
  }
  
  if (state.phase === 'placement') {
    // In placement phase, any empty cell is valid
    return state.board.some(cell => cell === null);
  }
  
  // In movement phase, check if current player has any valid moves
  for (let i = 0; i < 9; i++) {
    if (state.board[i] === state.currentPlayer) {
      const moves = getLegalMoves(state, i);
      if (moves.length > 0) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get all pieces belonging to a player.
 * @param board - Current board state
 * @param player - Player to find pieces for
 * @returns Array of cell indices containing player's pieces
 */
export function getPlayerPieces(board: CellValue[], player: Player): number[] {
  return board
    .map((cell, index) => (cell === player ? index : -1))
    .filter(index => index !== -1);
}

/**
 * Check if all pieces have been placed (6 total - 3 per player).
 * @param piecesPlaced - Current pieces placed count
 * @returns True if placement phase is complete
 */
export function isPlacementComplete(piecesPlaced: { X: number; O: number }): boolean {
  return piecesPlaced.X === 3 && piecesPlaced.O === 3;
}

/**
 * Get the opponent player.
 * @param player - Current player
 * @returns Opponent player
 */
export function getOpponent(player: Player): Player {
  return player === 'X' ? 'O' : 'X';
}
