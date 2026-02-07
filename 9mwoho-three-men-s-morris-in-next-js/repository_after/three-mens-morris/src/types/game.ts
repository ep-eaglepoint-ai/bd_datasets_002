/**
 * Three Men's Morris Game Types
 * 
 * This file defines all TypeScript types and interfaces for the game state management.
 */

/** Player identifiers - X always goes first */
export type Player = 'X' | 'O';

/** Cell can be empty (null) or occupied by a player */
export type CellValue = Player | null;

/** Game phases */
export type GamePhase = 'placement' | 'movement';

/** Game status */
export type GameStatus = 'playing' | 'won' | 'draw';

/** Rule variants configuration */
export interface RuleVariants {
  /** Allow diagonal movement in movement phase */
  diagonalMovement: boolean;
  /** Allow diagonal lines for winning */
  diagonalWin: boolean;
}

/** Pieces placed counter for each player */
export interface PiecesPlaced {
  X: number;
  O: number;
}

/** Complete game state */
export interface GameState {
  /** 9 cells representing the 3x3 board (indices 0-8) */
  board: CellValue[];
  /** Current player's turn */
  currentPlayer: Player;
  /** Current game phase */
  phase: GamePhase;
  /** Current game status */
  status: GameStatus;
  /** Winner if game is won */
  winner: Player | null;
  /** Currently selected piece index for movement phase */
  selectedPiece: number | null;
  /** Number of pieces placed by each player */
  piecesPlaced: PiecesPlaced;
  /** Rule variant settings */
  ruleVariants: RuleVariants;
  /** Status message to display to user */
  message: string;
}

/** Initial game state factory */
export const createInitialState = (): GameState => ({
  board: Array(9).fill(null),
  currentPlayer: 'X',
  phase: 'placement',
  status: 'playing',
  winner: null,
  selectedPiece: null,
  piecesPlaced: { X: 0, O: 0 },
  ruleVariants: {
    diagonalMovement: false,
    diagonalWin: true,
  },
  message: "Player X's turn - Place a piece",
});
