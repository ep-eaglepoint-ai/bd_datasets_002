/**
 * Three Men's Morris - Hook Tests
 * 
 * Tests for useGameState hook covering:
 * - Full game flow (placement -> movement)
 * - Win detection during gameplay
 * - Reset functionality
 * - Rule variant toggles
 * - Edge cases
 */

import { renderHook, act } from '@testing-library/react';
import { useGameState } from '@/hooks/useGameState';

describe('useGameState Hook', () => {
  
  // ============================================================
  // INITIALIZATION TESTS
  // ============================================================
  describe('Initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useGameState());
      
      expect(result.current.gameState.board).toEqual(Array(9).fill(null));
      expect(result.current.gameState.currentPlayer).toBe('X');
      expect(result.current.gameState.phase).toBe('placement');
      expect(result.current.gameState.status).toBe('playing');
      expect(result.current.gameState.winner).toBe(null);
      expect(result.current.gameState.selectedPiece).toBe(null);
    });

    it('should provide action handlers', () => {
      const { result } = renderHook(() => useGameState());
      
      expect(typeof result.current.handleCellClick).toBe('function');
      expect(typeof result.current.resetGame).toBe('function');
      expect(typeof result.current.toggleDiagonalMovement).toBe('function');
      expect(typeof result.current.toggleDiagonalWin).toBe('function');
    });
  });

  // ============================================================
  // PLACEMENT PHASE TESTS
  // ============================================================
  describe('Placement Phase', () => {
    it('should place piece and switch player', () => {
      const { result } = renderHook(() => useGameState());
      
      act(() => {
        result.current.handleCellClick(0);
      });
      
      expect(result.current.gameState.board[0]).toBe('X');
      expect(result.current.gameState.currentPlayer).toBe('O');
      expect(result.current.gameState.piecesPlaced.X).toBe(1);
    });

    it('should alternate between players', () => {
      const { result } = renderHook(() => useGameState());
      
      act(() => {
        result.current.handleCellClick(0); // X places
      });
      act(() => {
        result.current.handleCellClick(1); // O places
      });
      act(() => {
        result.current.handleCellClick(2); // X places
      });
      
      expect(result.current.gameState.board[0]).toBe('X');
      expect(result.current.gameState.board[1]).toBe('O');
      expect(result.current.gameState.board[2]).toBe('X');
      expect(result.current.gameState.currentPlayer).toBe('O');
    });

    it('should not allow placement on occupied cell', () => {
      const { result } = renderHook(() => useGameState());
      
      act(() => {
        result.current.handleCellClick(0); // X places at 0
      });
      act(() => {
        result.current.handleCellClick(0); // O tries to place at 0
      });
      
      expect(result.current.gameState.board[0]).toBe('X');
      expect(result.current.gameState.currentPlayer).toBe('O'); // Still O's turn
    });

    it('should transition to movement phase after all pieces placed', () => {
      const { result } = renderHook(() => useGameState());
      
      // Place all 6 pieces
      const moves = [0, 1, 2, 3, 4, 5];
      moves.forEach((cellIndex) => {
        act(() => {
          result.current.handleCellClick(cellIndex);
        });
      });
      
      expect(result.current.gameState.phase).toBe('movement');
      expect(result.current.gameState.piecesPlaced.X).toBe(3);
      expect(result.current.gameState.piecesPlaced.O).toBe(3);
    });
  });

  // ============================================================
  // MOVEMENT PHASE TESTS
  // ============================================================
  describe('Movement Phase', () => {
    const setupMovementPhase = () => {
      const { result } = renderHook(() => useGameState());
      
      // X: 0, 2, 4 | O: 1, 3, 5
      const moves = [0, 1, 2, 3, 4, 5];
      moves.forEach((cellIndex) => {
        act(() => {
          result.current.handleCellClick(cellIndex);
        });
      });
      
      return result;
    };

    it('should allow selecting own piece', () => {
      const result = setupMovementPhase();
      // Current player is O
      
      act(() => {
        result.current.handleCellClick(4); // X selects their piece at 4
      });
      
      expect(result.current.gameState.selectedPiece).toBe(4);
    });

    it('should allow moving to adjacent empty cell', () => {
      const result = setupMovementPhase();
      // Board: X O X | O X O | - - -
      // Current player is O
      
      act(() => {
        result.current.handleCellClick(4); // X selects piece at 4
      });
      act(() => {
        result.current.handleCellClick(7); // X moves to 7
      });
      
      expect(result.current.gameState.board[4]).toBe(null);
      expect(result.current.gameState.board[7]).toBe('X');
      expect(result.current.gameState.currentPlayer).toBe('O');
    });

    it('should deselect piece when clicking it again', () => {
      const result = setupMovementPhase();
      
      act(() => {
        result.current.handleCellClick(4); // X selects piece at 4
      });
      expect(result.current.gameState.selectedPiece).toBe(4);
      
      act(() => {
        result.current.handleCellClick(4); // X clicks same piece to deselect
      });
      expect(result.current.gameState.selectedPiece).toBe(null);
    });

    it('should switch selection when clicking another own piece', () => {
      const { result } = renderHook(() => useGameState());
      
      // Custom setup where X has multiple movable pieces
      // X: 0, 4, 6
      // O: 1, 5, 8
      const moves = [0, 1, 4, 5, 6, 8];
      moves.forEach((cellIndex) => {
        act(() => { result.current.handleCellClick(cellIndex); });
      });

      // X selects piece at 4 (valid moves: 1, 3, 7)
      act(() => {
        result.current.handleCellClick(4); 
      });
      expect(result.current.gameState.selectedPiece).toBe(4);

      // X selects different piece at 0 (valid moves: 1, 3)
      act(() => {
        result.current.handleCellClick(0); 
      });
      
      expect(result.current.gameState.selectedPiece).toBe(0);
    });

    it('should not allow moving to non-adjacent cell', () => {
      const result = setupMovementPhase();
      // X at 4, try to move to 0 (diagonal - not adjacent without rule)
      
      act(() => {
        result.current.handleCellClick(4);
      });
      act(() => {
        result.current.handleCellClick(0);
      });
      
      // Move should not happen
      expect(result.current.gameState.board[4]).toBe('X');
      expect(result.current.gameState.board[0]).toBe('X'); // 0 is occupied by X, so it just switches selection
      expect(result.current.gameState.currentPlayer).toBe('X'); // Still X's turn
    });
  });

  // ============================================================
  // WIN DETECTION TESTS
  // ============================================================
  describe('Win Detection', () => {
    it('should detect win during placement phase', () => {
      const { result } = renderHook(() => useGameState());
      
      // X places: 0, 2 (top corners)
      // O places: 3, 4
      // X places: 1 (wins top row)
      act(() => { result.current.handleCellClick(0); }); // X
      act(() => { result.current.handleCellClick(3); }); // O
      act(() => { result.current.handleCellClick(1); }); // X
      act(() => { result.current.handleCellClick(4); }); // O
      act(() => { result.current.handleCellClick(2); }); // X wins!
      
      expect(result.current.gameState.status).toBe('won');
      expect(result.current.gameState.winner).toBe('X');
    });

    it('should detect vertical win', () => {
      const { result } = renderHook(() => useGameState());
      
      // X: 0, 3, 6 (left column)
      act(() => { result.current.handleCellClick(0); }); // X
      act(() => { result.current.handleCellClick(1); }); // O
      act(() => { result.current.handleCellClick(3); }); // X
      act(() => { result.current.handleCellClick(4); }); // O
      act(() => { result.current.handleCellClick(6); }); // X wins!
      
      expect(result.current.gameState.status).toBe('won');
      expect(result.current.gameState.winner).toBe('X');
    });

    it('should detect diagonal win when enabled', () => {
      const { result } = renderHook(() => useGameState());
      
      // X: 0, 4, 8 (main diagonal)
      act(() => { result.current.handleCellClick(0); }); // X
      act(() => { result.current.handleCellClick(1); }); // O
      act(() => { result.current.handleCellClick(4); }); // X
      act(() => { result.current.handleCellClick(2); }); // O
      act(() => { result.current.handleCellClick(8); }); // X wins!
      
      expect(result.current.gameState.status).toBe('won');
      expect(result.current.gameState.winner).toBe('X');
    });

    it('should not allow moves after game is won', () => {
      const { result } = renderHook(() => useGameState());
      
      // Get to win state
      act(() => { result.current.handleCellClick(0); }); // X
      act(() => { result.current.handleCellClick(3); }); // O
      act(() => { result.current.handleCellClick(1); }); // X
      act(() => { result.current.handleCellClick(4); }); // O
      act(() => { result.current.handleCellClick(2); }); // X wins!
      
      expect(result.current.gameState.status).toBe('won');
      
      // Try to place another piece
      act(() => { result.current.handleCellClick(5); });
      expect(result.current.gameState.board[5]).toBe(null);
    });
  });

  // ============================================================
  // RESET FUNCTIONALITY TESTS
  // ============================================================
  describe('Reset Functionality', () => {
    it('should reset game to initial state', () => {
      const { result } = renderHook(() => useGameState());
      
      // Make some moves
      act(() => { result.current.handleCellClick(0); });
      act(() => { result.current.handleCellClick(1); });
      act(() => { result.current.handleCellClick(2); });
      
      // Reset
      act(() => { result.current.resetGame(); });
      
      expect(result.current.gameState.board).toEqual(Array(9).fill(null));
      expect(result.current.gameState.currentPlayer).toBe('X');
      expect(result.current.gameState.phase).toBe('placement');
      expect(result.current.gameState.piecesPlaced.X).toBe(0);
      expect(result.current.gameState.piecesPlaced.O).toBe(0);
    });

    it('should reset after game is won', () => {
      const { result } = renderHook(() => useGameState());
      
      // Win the game
      act(() => { result.current.handleCellClick(0); }); // X
      act(() => { result.current.handleCellClick(3); }); // O
      act(() => { result.current.handleCellClick(1); }); // X
      act(() => { result.current.handleCellClick(4); }); // O
      act(() => { result.current.handleCellClick(2); }); // X wins!
      
      expect(result.current.gameState.status).toBe('won');
      
      // Reset
      act(() => { result.current.resetGame(); });
      
      expect(result.current.gameState.status).toBe('playing');
      expect(result.current.gameState.winner).toBe(null);
    });

    it('should clear selected piece on reset', () => {
      const { result } = renderHook(() => useGameState());
      
      // Get to movement phase
      const moves = [0, 1, 2, 3, 4, 5];
      moves.forEach((cellIndex) => {
        act(() => { result.current.handleCellClick(cellIndex); });
      });
      
      // Select a piece
      act(() => { result.current.handleCellClick(4); });
      expect(result.current.gameState.selectedPiece).toBe(4);
      
      // Reset
      act(() => { result.current.resetGame(); });
      expect(result.current.gameState.selectedPiece).toBe(null);
    });
  });

  // ============================================================
  // RULE VARIANT TESTS
  // ============================================================
  describe('Rule Variants', () => {
    it('should toggle diagonal movement', () => {
      const { result } = renderHook(() => useGameState());
      
      expect(result.current.gameState.ruleVariants.diagonalMovement).toBe(false);
      
      act(() => { result.current.toggleDiagonalMovement(); });
      expect(result.current.gameState.ruleVariants.diagonalMovement).toBe(true);
      
      act(() => { result.current.toggleDiagonalMovement(); });
      expect(result.current.gameState.ruleVariants.diagonalMovement).toBe(false);
    });

    it('should toggle diagonal win', () => {
      const { result } = renderHook(() => useGameState());
      
      expect(result.current.gameState.ruleVariants.diagonalWin).toBe(true);
      
      act(() => { result.current.toggleDiagonalWin(); });
      expect(result.current.gameState.ruleVariants.diagonalWin).toBe(false);
      
      act(() => { result.current.toggleDiagonalWin(); });
      expect(result.current.gameState.ruleVariants.diagonalWin).toBe(true);
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================
  describe('Edge Cases', () => {
    it('should handle rapid consecutive clicks on same cell', () => {
      const { result } = renderHook(() => useGameState());
      
      // Rapidly click same cell multiple times
      act(() => {
        result.current.handleCellClick(0);
        result.current.handleCellClick(0);
        result.current.handleCellClick(0);
      });
      
      // Should only register first click
      expect(result.current.gameState.board[0]).toBe('X');
      expect(result.current.gameState.piecesPlaced.X).toBe(1);
    });

    it('should maintain consistent state after rapid turn switching', () => {
      const { result } = renderHook(() => useGameState());
      
      // Rapid moves
      act(() => {
        result.current.handleCellClick(0);
        result.current.handleCellClick(1);
        result.current.handleCellClick(2);
      });
      
      expect(result.current.gameState.board[0]).toBe('X');
      expect(result.current.gameState.board[1]).toBe('O');
      expect(result.current.gameState.board[2]).toBe('X');
      expect(result.current.gameState.piecesPlaced.X).toBe(2);
      expect(result.current.gameState.piecesPlaced.O).toBe(1);
    });

    it('should not allow selecting opponent pieces', () => {
      const { result } = renderHook(() => useGameState());
      
      // Get to movement phase - O's turn
      const moves = [0, 1, 2, 3, 4, 5];
      moves.forEach((cellIndex) => {
        act(() => { result.current.handleCellClick(cellIndex); });
      });
      
      // O tries to select X's piece at 0
      act(() => { result.current.handleCellClick(0); });
      expect(result.current.gameState.selectedPiece).toBe(null);
    });

    it('should handle rule toggle during game without breaking state', () => {
      const { result } = renderHook(() => useGameState());
      
      // Make some moves
      act(() => { result.current.handleCellClick(0); });
      act(() => { result.current.handleCellClick(1); });
      
      // Toggle rules
      act(() => { result.current.toggleDiagonalMovement(); });
      act(() => { result.current.toggleDiagonalWin(); });
      
      // Continue game
      act(() => { result.current.handleCellClick(2); });
      
      expect(result.current.gameState.board[2]).toBe('X');
      expect(result.current.gameState.ruleVariants.diagonalMovement).toBe(true);
      expect(result.current.gameState.ruleVariants.diagonalWin).toBe(false);
    });
  });

  // ============================================================
  // LEGAL MOVES HELPER TESTS
  // ============================================================
  describe('getSelectedPieceLegalMoves', () => {
    it('should return empty array when no piece selected', () => {
      const { result } = renderHook(() => useGameState());
      expect(result.current.getSelectedPieceLegalMoves()).toEqual([]);
    });

    it('should return legal moves for selected piece', () => {
      const { result } = renderHook(() => useGameState());
      
      // Get to movement phase
      const moves = [0, 1, 2, 3, 4, 5];
      moves.forEach((cellIndex) => {
        act(() => { result.current.handleCellClick(cellIndex); });
      });
      
      // X selects piece at 4
      act(() => { result.current.handleCellClick(4); });
      
      // Piece at 4 has legal move to 7
      
      const legalMoves = result.current.getSelectedPieceLegalMoves();
      expect(legalMoves).toContain(7);
    });
  });
});
