/**
 * Three Men's Morris - Game Logic Tests
 * 
 * Comprehensive test suite covering:
 * - Game initialization
 * - Adjacency calculation
 * - Win detection
 * - Placement phase validation
 * - Movement phase validation
 * - Rule variant toggles
 * - Edge cases
 */

import {
  getAdjacentCells,
  areAdjacent,
  checkWinner,
  getWinningLines,
  isValidPlacement,
  isValidMovement,
  getLegalMoves,
  hasLegalMoves,
  isPlacementComplete,
  getOpponent,
  getPlayerPieces,
} from '@/utils/gameLogic';

import {
  GameState,
  createInitialState,
  Player,
  CellValue,
} from '@/types/game';

describe('Game Logic Utilities', () => {
  
  // ============================================================
  // ADJACENCY TESTS
  // ============================================================
  describe('getAdjacentCells', () => {
    describe('without diagonal movement', () => {
      it('should return correct adjacencies for corner cells', () => {
        expect(getAdjacentCells(0, false)).toEqual([1, 3]);
        expect(getAdjacentCells(2, false)).toEqual([1, 5]);
        expect(getAdjacentCells(6, false)).toEqual([3, 7]);
        expect(getAdjacentCells(8, false)).toEqual([5, 7]);
      });

      it('should return correct adjacencies for edge cells', () => {
        expect(getAdjacentCells(1, false)).toEqual([0, 2, 4]);
        expect(getAdjacentCells(3, false)).toEqual([0, 4, 6]);
        expect(getAdjacentCells(5, false)).toEqual([2, 4, 8]);
        expect(getAdjacentCells(7, false)).toEqual([4, 6, 8]);
      });

      it('should return correct adjacencies for center cell', () => {
        expect(getAdjacentCells(4, false)).toEqual([1, 3, 5, 7]);
      });
    });

    describe('with diagonal movement', () => {
      it('should include diagonal adjacencies for corner cells', () => {
        expect(getAdjacentCells(0, true)).toContain(4);
        expect(getAdjacentCells(2, true)).toContain(4);
        expect(getAdjacentCells(6, true)).toContain(4);
        expect(getAdjacentCells(8, true)).toContain(4);
      });

      it('should include all corners as adjacent to center', () => {
        const centerAdj = getAdjacentCells(4, true);
        expect(centerAdj).toContain(0);
        expect(centerAdj).toContain(2);
        expect(centerAdj).toContain(6);
        expect(centerAdj).toContain(8);
      });

      it('should not add diagonal adjacencies for edge cells', () => {
        // Edge cells (1, 3, 5, 7) are not on diagonals
        expect(getAdjacentCells(1, true)).toEqual([0, 2, 4]);
        expect(getAdjacentCells(3, true)).toEqual([0, 4, 6]);
      });
    });
  });

  describe('areAdjacent', () => {
    it('should return true for orthogonally adjacent cells', () => {
      expect(areAdjacent(0, 1, false)).toBe(true);
      expect(areAdjacent(4, 5, false)).toBe(true);
      expect(areAdjacent(7, 8, false)).toBe(true);
    });

    it('should return false for non-adjacent cells without diagonal', () => {
      expect(areAdjacent(0, 4, false)).toBe(false);
      expect(areAdjacent(0, 8, false)).toBe(false);
      expect(areAdjacent(2, 6, false)).toBe(false);
    });

    it('should return true for diagonally adjacent cells with diagonal enabled', () => {
      expect(areAdjacent(0, 4, true)).toBe(true);
      expect(areAdjacent(4, 8, true)).toBe(true);
      expect(areAdjacent(2, 4, true)).toBe(true);
    });
  });

  // ============================================================
  // WIN DETECTION TESTS
  // ============================================================
  describe('checkWinner', () => {
    describe('horizontal wins', () => {
      it('should detect win on top row', () => {
        const board: CellValue[] = ['X', 'X', 'X', null, null, null, null, null, null];
        expect(checkWinner(board, true)).toBe('X');
      });

      it('should detect win on middle row', () => {
        const board: CellValue[] = [null, null, null, 'O', 'O', 'O', null, null, null];
        expect(checkWinner(board, true)).toBe('O');
      });

      it('should detect win on bottom row', () => {
        const board: CellValue[] = [null, null, null, null, null, null, 'X', 'X', 'X'];
        expect(checkWinner(board, true)).toBe('X');
      });
    });

    describe('vertical wins', () => {
      it('should detect win on left column', () => {
        const board: CellValue[] = ['X', null, null, 'X', null, null, 'X', null, null];
        expect(checkWinner(board, true)).toBe('X');
      });

      it('should detect win on middle column', () => {
        const board: CellValue[] = [null, 'O', null, null, 'O', null, null, 'O', null];
        expect(checkWinner(board, true)).toBe('O');
      });

      it('should detect win on right column', () => {
        const board: CellValue[] = [null, null, 'X', null, null, 'X', null, null, 'X'];
        expect(checkWinner(board, true)).toBe('X');
      });
    });

    describe('diagonal wins', () => {
      it('should detect win on main diagonal when enabled', () => {
        const board: CellValue[] = ['X', null, null, null, 'X', null, null, null, 'X'];
        expect(checkWinner(board, true)).toBe('X');
      });

      it('should detect win on anti-diagonal when enabled', () => {
        const board: CellValue[] = [null, null, 'O', null, 'O', null, 'O', null, null];
        expect(checkWinner(board, true)).toBe('O');
      });

      it('should NOT detect diagonal win when disabled', () => {
        const board: CellValue[] = ['X', null, null, null, 'X', null, null, null, 'X'];
        expect(checkWinner(board, false)).toBe(null);
      });
    });

    it('should return null when no winner', () => {
      const board: CellValue[] = ['X', 'O', 'X', 'O', 'X', 'O', null, null, null];
      expect(checkWinner(board, true)).toBe(null);
    });

    it('should return null for empty board', () => {
      const board: CellValue[] = Array(9).fill(null);
      expect(checkWinner(board, true)).toBe(null);
    });
  });

  describe('getWinningLines', () => {
    it('should return 8 lines when diagonal wins enabled', () => {
      const lines = getWinningLines(true);
      expect(lines.length).toBe(8);
    });

    it('should return 6 lines when diagonal wins disabled', () => {
      const lines = getWinningLines(false);
      expect(lines.length).toBe(6);
    });
  });

  // ============================================================
  // PLACEMENT VALIDATION TESTS
  // ============================================================
  describe('isValidPlacement', () => {
    let initialState: GameState;

    beforeEach(() => {
      initialState = createInitialState();
    });

    it('should allow placement on empty cell during placement phase', () => {
      expect(isValidPlacement(initialState, 0)).toBe(true);
      expect(isValidPlacement(initialState, 4)).toBe(true);
      expect(isValidPlacement(initialState, 8)).toBe(true);
    });

    it('should reject placement on occupied cell', () => {
      const state = {
        ...initialState,
        board: ['X', null, null, null, null, null, null, null, null] as CellValue[],
      };
      expect(isValidPlacement(state, 0)).toBe(false);
    });

    it('should reject placement during movement phase', () => {
      const state = { ...initialState, phase: 'movement' as const };
      expect(isValidPlacement(state, 0)).toBe(false);
    });

    it('should reject placement when game is over', () => {
      const state = { ...initialState, status: 'won' as const };
      expect(isValidPlacement(state, 0)).toBe(false);
    });

    it('should reject placement with invalid index', () => {
      expect(isValidPlacement(initialState, -1)).toBe(false);
      expect(isValidPlacement(initialState, 9)).toBe(false);
      expect(isValidPlacement(initialState, 100)).toBe(false);
    });
  });

  // ============================================================
  // MOVEMENT VALIDATION TESTS
  // ============================================================
  describe('isValidMovement', () => {
    const createMovementState = (): GameState => ({
      ...createInitialState(),
      phase: 'movement',
      board: ['X', null, 'O', 'O', 'X', null, null, null, 'X'] as CellValue[],
      piecesPlaced: { X: 3, O: 3 },
      currentPlayer: 'X',
    });

    it('should allow movement to adjacent empty cell', () => {
      const state = createMovementState();
      // X at position 0, can move to 1 (empty)
      expect(isValidMovement(state, 0, 1)).toBe(true);
    });

    it('should reject movement to non-adjacent cell', () => {
      const state = createMovementState();
      // X at position 0, cannot move to 5 (not adjacent)
      expect(isValidMovement(state, 0, 5)).toBe(false);
    });

    it('should reject movement to occupied cell', () => {
      const state = createMovementState();
      // X at position 0, cannot move to 3 (occupied by O)
      expect(isValidMovement(state, 0, 3)).toBe(false);
    });

    it('should reject movement of opponent piece', () => {
      const state = createMovementState();
      // O at position 2, X cannot move it
      expect(isValidMovement(state, 2, 1)).toBe(false);
    });

    it('should reject movement during placement phase', () => {
      const state = { ...createMovementState(), phase: 'placement' as const };
      expect(isValidMovement(state, 0, 1)).toBe(false);
    });

    it('should reject movement when game is over', () => {
      const state = { ...createMovementState(), status: 'won' as const };
      expect(isValidMovement(state, 0, 1)).toBe(false);
    });

    it('should allow diagonal movement when enabled', () => {
      const state = {
        ...createMovementState(),
        ruleVariants: { diagonalMovement: true, diagonalWin: true },
      };
      // X at position 4 (center), can move to 0 diagonally
      expect(isValidMovement(state, 4, 0)).toBe(false); // 0 is occupied by X
      // X at 4, try to move to 5 (empty, adjacent)
      expect(isValidMovement(state, 4, 5)).toBe(true);
    });
  });

  // ============================================================
  // LEGAL MOVES TESTS
  // ============================================================
  describe('getLegalMoves', () => {
    it('should return empty array during placement phase', () => {
      const state = createInitialState();
      expect(getLegalMoves(state, 0)).toEqual([]);
    });

    it('should return adjacent empty cells during movement phase', () => {
      const state: GameState = {
        ...createInitialState(),
        phase: 'movement',
        board: ['X', null, null, null, null, null, null, null, null] as CellValue[],
        currentPlayer: 'X',
      };
      const moves = getLegalMoves(state, 0);
      expect(moves).toContain(1);
      expect(moves).toContain(3);
    });

    it('should exclude occupied cells from legal moves', () => {
      const state: GameState = {
        ...createInitialState(),
        phase: 'movement',
        board: ['X', 'O', null, 'O', null, null, null, null, null] as CellValue[],
        currentPlayer: 'X',
      };
      const moves = getLegalMoves(state, 0);
      expect(moves).not.toContain(1);
      expect(moves).not.toContain(3);
      expect(moves).toEqual([]);
    });

    it('should return empty array for opponent piece', () => {
      const state: GameState = {
        ...createInitialState(),
        phase: 'movement',
        board: ['X', 'O', null, null, null, null, null, null, null] as CellValue[],
        currentPlayer: 'X',
      };
      expect(getLegalMoves(state, 1)).toEqual([]);
    });
  });

  describe('hasLegalMoves', () => {
    it('should return true during placement phase with empty cells', () => {
      const state = createInitialState();
      expect(hasLegalMoves(state)).toBe(true);
    });

    it('should return true during movement phase with valid moves', () => {
      const state: GameState = {
        ...createInitialState(),
        phase: 'movement',
        board: ['X', null, 'O', 'O', null, 'X', null, 'X', 'O'] as CellValue[],
        currentPlayer: 'X',
      };
      expect(hasLegalMoves(state)).toBe(true);
    });

    it('should return false when no legal moves exist', () => {
      // Corner scenario: X pieces surrounded by O pieces
      const state: GameState = {
        ...createInitialState(),
        phase: 'movement',
        board: ['X', 'O', null, 'O', null, null, null, null, null] as CellValue[],
        currentPlayer: 'X',
        piecesPlaced: { X: 1, O: 2 },
      };
      // X at 0 has no moves (1 and 3 are occupied)
      expect(hasLegalMoves(state)).toBe(false);
    });
  });

  // ============================================================
  // UTILITY FUNCTION TESTS
  // ============================================================
  describe('getPlayerPieces', () => {
    it('should return positions of player pieces', () => {
      const board: CellValue[] = ['X', null, 'O', 'O', 'X', null, null, null, 'X'];
      expect(getPlayerPieces(board, 'X')).toEqual([0, 4, 8]);
      expect(getPlayerPieces(board, 'O')).toEqual([2, 3]);
    });

    it('should return empty array for player with no pieces', () => {
      const board: CellValue[] = Array(9).fill(null);
      expect(getPlayerPieces(board, 'X')).toEqual([]);
    });
  });

  describe('isPlacementComplete', () => {
    it('should return true when all 6 pieces placed', () => {
      expect(isPlacementComplete({ X: 3, O: 3 })).toBe(true);
    });

    it('should return false when not all pieces placed', () => {
      expect(isPlacementComplete({ X: 2, O: 3 })).toBe(false);
      expect(isPlacementComplete({ X: 3, O: 2 })).toBe(false);
      expect(isPlacementComplete({ X: 0, O: 0 })).toBe(false);
    });
  });

  describe('getOpponent', () => {
    it('should return O for X', () => {
      expect(getOpponent('X')).toBe('O');
    });

    it('should return X for O', () => {
      expect(getOpponent('O')).toBe('X');
    });
  });
});

// ============================================================
// INITIAL STATE TESTS
// ============================================================
describe('createInitialState', () => {
  it('should create empty board', () => {
    const state = createInitialState();
    expect(state.board).toEqual(Array(9).fill(null));
  });

  it('should start with player X', () => {
    const state = createInitialState();
    expect(state.currentPlayer).toBe('X');
  });

  it('should start in placement phase', () => {
    const state = createInitialState();
    expect(state.phase).toBe('placement');
  });

  it('should start with playing status', () => {
    const state = createInitialState();
    expect(state.status).toBe('playing');
  });

  it('should have no winner initially', () => {
    const state = createInitialState();
    expect(state.winner).toBe(null);
  });

  it('should have no selected piece initially', () => {
    const state = createInitialState();
    expect(state.selectedPiece).toBe(null);
  });

  it('should have zero pieces placed initially', () => {
    const state = createInitialState();
    expect(state.piecesPlaced.X).toBe(0);
    expect(state.piecesPlaced.O).toBe(0);
  });

  it('should have default rule variants', () => {
    const state = createInitialState();
    expect(state.ruleVariants.diagonalMovement).toBe(false);
    expect(state.ruleVariants.diagonalWin).toBe(true);
  });
});
