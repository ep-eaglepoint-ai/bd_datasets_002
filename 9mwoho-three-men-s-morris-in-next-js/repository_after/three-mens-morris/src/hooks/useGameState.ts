'use client';

/**
 * Three Men's Morris Game State Management Hook
 * 
 * Custom React hook that manages all game state and provides actions
 * for game interaction. Uses React hooks only (no external state libraries).
 */

import { useState, useCallback } from 'react';
import {
  GameState,
  Player,
  createInitialState,
} from '@/types/game';
import {
  checkWinner,
  isValidPlacement,
  isValidMovement,
  getLegalMoves,
  hasLegalMoves,
  isPlacementComplete,
  getOpponent,
} from '@/utils/gameLogic';

/**
 * Custom hook for managing Three Men's Morris game state.
 * @returns Game state and action handlers
 */
export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);

  /**
   * Generate status message based on game state.
   */
  const getMessage = useCallback((state: GameState): string => {
    if (state.status === 'won') {
      return `🎉 Player ${state.winner} wins!`;
    }
    
    if (state.status === 'draw') {
      return "It's a draw! No valid moves available.";
    }
    
    const playerName = `Player ${state.currentPlayer}`;
    
    if (state.phase === 'placement') {
      const remaining = 3 - state.piecesPlaced[state.currentPlayer];
      return `${playerName}'s turn - Place a piece (${remaining} remaining)`;
    }
    
    if (state.selectedPiece !== null) {
      return `${playerName}'s turn - Select destination (or click piece again to deselect)`;
    }
    
    return `${playerName}'s turn - Select a piece to move`;
  }, []);

  /**
   * Handle cell click during placement phase.
   */
  const handlePlacement = useCallback((cellIndex: number) => {
    setGameState((prevState) => {
      if (!isValidPlacement(prevState, cellIndex)) {
        return prevState;
      }

      // Place the piece
      const newBoard = [...prevState.board];
      newBoard[cellIndex] = prevState.currentPlayer;

      const newPiecesPlaced = {
        ...prevState.piecesPlaced,
        [prevState.currentPlayer]: prevState.piecesPlaced[prevState.currentPlayer] + 1,
      };

      // Check for winner after placement
      const winner = checkWinner(newBoard, prevState.ruleVariants.diagonalWin);
      if (winner) {
        const newState: GameState = {
          ...prevState,
          board: newBoard,
          piecesPlaced: newPiecesPlaced,
          status: 'won',
          winner,
          message: '',
        };
        return { ...newState, message: getMessage(newState) };
      }

      // Check if placement phase is complete
      const placementComplete = isPlacementComplete(newPiecesPlaced);
      const nextPlayer = getOpponent(prevState.currentPlayer);
      const nextPhase = placementComplete ? 'movement' : 'placement';

      const newState: GameState = {
        ...prevState,
        board: newBoard,
        piecesPlaced: newPiecesPlaced,
        currentPlayer: nextPlayer,
        phase: nextPhase,
        message: '',
      };

      // Check for stalemate in movement phase
      if (nextPhase === 'movement' && !hasLegalMoves(newState)) {
        return {
          ...newState,
          status: 'draw',
          message: "It's a draw! No valid moves available.",
        };
      }

      return { ...newState, message: getMessage(newState) };
    });
  }, [getMessage]);

  /**
   * Handle cell click during movement phase.
   */
  const handleMovement = useCallback((cellIndex: number) => {
    setGameState((prevState) => {
      if (prevState.status !== 'playing') {
        return prevState;
      }

      const clickedCell = prevState.board[cellIndex];

      // If no piece is selected
      if (prevState.selectedPiece === null) {
        // Check if clicked on current player's piece
        if (clickedCell === prevState.currentPlayer) {
          const legalMoves = getLegalMoves(prevState, cellIndex);
          if (legalMoves.length > 0) {
            const newState: GameState = {
              ...prevState,
              selectedPiece: cellIndex,
              message: '',
            };
            return { ...newState, message: getMessage(newState) };
          }
        }
        return prevState;
      }

      // If clicking the same piece, deselect it
      if (cellIndex === prevState.selectedPiece) {
        const newState: GameState = {
          ...prevState,
          selectedPiece: null,
          message: '',
        };
        return { ...newState, message: getMessage(newState) };
      }

      // If clicking another own piece, select it instead
      if (clickedCell === prevState.currentPlayer) {
        const legalMoves = getLegalMoves(prevState, cellIndex);
        if (legalMoves.length > 0) {
          const newState: GameState = {
            ...prevState,
            selectedPiece: cellIndex,
            message: '',
          };
          return { ...newState, message: getMessage(newState) };
        }
        return prevState;
      }

      // Try to move to the clicked cell
      if (!isValidMovement(prevState, prevState.selectedPiece, cellIndex)) {
        return prevState;
      }

      // Execute the move
      const newBoard = [...prevState.board];
      newBoard[prevState.selectedPiece] = null;
      newBoard[cellIndex] = prevState.currentPlayer;

      // Check for winner after move
      const winner = checkWinner(newBoard, prevState.ruleVariants.diagonalWin);
      if (winner) {
        const newState: GameState = {
          ...prevState,
          board: newBoard,
          selectedPiece: null,
          status: 'won',
          winner,
          message: '',
        };
        return { ...newState, message: getMessage(newState) };
      }

      const nextPlayer = getOpponent(prevState.currentPlayer);
      const newState: GameState = {
        ...prevState,
        board: newBoard,
        currentPlayer: nextPlayer,
        selectedPiece: null,
        message: '',
      };

      // Check for stalemate
      if (!hasLegalMoves(newState)) {
        return {
          ...newState,
          status: 'draw',
          message: "It's a draw! No valid moves available.",
        };
      }

      return { ...newState, message: getMessage(newState) };
    });
  }, [getMessage]);

  /**
   * Handle cell click - routes to appropriate handler based on phase.
   */
  const handleCellClick = useCallback((cellIndex: number) => {
    setGameState((prevState) => {
      if (prevState.status !== 'playing') {
        return prevState;
      }

      if (prevState.phase === 'placement') {
        // Use a temporary state update for placement
        return prevState; // Will be handled by handlePlacement
      }

      return prevState; // Will be handled by handleMovement
    });

    // Route to appropriate handler
    setGameState((prevState) => {
      if (prevState.phase === 'placement') {
        // Inline the placement logic to avoid stale closure
        if (!isValidPlacement(prevState, cellIndex)) {
          return prevState;
        }

        const newBoard = [...prevState.board];
        newBoard[cellIndex] = prevState.currentPlayer;

        const newPiecesPlaced = {
          ...prevState.piecesPlaced,
          [prevState.currentPlayer]: prevState.piecesPlaced[prevState.currentPlayer] + 1,
        };

        const winner = checkWinner(newBoard, prevState.ruleVariants.diagonalWin);
        if (winner) {
          return {
            ...prevState,
            board: newBoard,
            piecesPlaced: newPiecesPlaced,
            status: 'won' as const,
            winner,
            message: `🎉 Player ${winner} wins!`,
          };
        }

        const placementComplete = isPlacementComplete(newPiecesPlaced);
        const nextPlayer = getOpponent(prevState.currentPlayer);
        const nextPhase = placementComplete ? 'movement' as const : 'placement' as const;

        const newState: GameState = {
          ...prevState,
          board: newBoard,
          piecesPlaced: newPiecesPlaced,
          currentPlayer: nextPlayer,
          phase: nextPhase,
          message: '',
        };

        if (nextPhase === 'movement' && !hasLegalMoves(newState)) {
          return {
            ...newState,
            status: 'draw' as const,
            message: "It's a draw! No valid moves available.",
          };
        }

        const remaining = 3 - newPiecesPlaced[nextPlayer];
        return {
          ...newState,
          message: nextPhase === 'placement'
            ? `Player ${nextPlayer}'s turn - Place a piece (${remaining} remaining)`
            : `Player ${nextPlayer}'s turn - Select a piece to move`,
        };
      } else {
        // Movement phase logic
        if (prevState.status !== 'playing') {
          return prevState;
        }

        const clickedCell = prevState.board[cellIndex];

        if (prevState.selectedPiece === null) {
          if (clickedCell === prevState.currentPlayer) {
            const legalMoves = getLegalMoves(prevState, cellIndex);
            if (legalMoves.length > 0) {
              return {
                ...prevState,
                selectedPiece: cellIndex,
                message: `Player ${prevState.currentPlayer}'s turn - Select destination (or click piece again to deselect)`,
              };
            }
          }
          return prevState;
        }

        if (cellIndex === prevState.selectedPiece) {
          return {
            ...prevState,
            selectedPiece: null,
            message: `Player ${prevState.currentPlayer}'s turn - Select a piece to move`,
          };
        }

        if (clickedCell === prevState.currentPlayer) {
          const legalMoves = getLegalMoves(prevState, cellIndex);
          if (legalMoves.length > 0) {
            return {
              ...prevState,
              selectedPiece: cellIndex,
              message: `Player ${prevState.currentPlayer}'s turn - Select destination (or click piece again to deselect)`,
            };
          }
          return prevState;
        }

        if (!isValidMovement(prevState, prevState.selectedPiece, cellIndex)) {
          return prevState;
        }

        const newBoard = [...prevState.board];
        newBoard[prevState.selectedPiece] = null;
        newBoard[cellIndex] = prevState.currentPlayer;

        const winner = checkWinner(newBoard, prevState.ruleVariants.diagonalWin);
        if (winner) {
          return {
            ...prevState,
            board: newBoard,
            selectedPiece: null,
            status: 'won' as const,
            winner,
            message: `🎉 Player ${winner} wins!`,
          };
        }

        const nextPlayer = getOpponent(prevState.currentPlayer);
        const newState: GameState = {
          ...prevState,
          board: newBoard,
          currentPlayer: nextPlayer,
          selectedPiece: null,
          message: `Player ${nextPlayer}'s turn - Select a piece to move`,
        };

        if (!hasLegalMoves(newState)) {
          return {
            ...newState,
            status: 'draw' as const,
            message: "It's a draw! No valid moves available.",
          };
        }

        return newState;
      }
    });
  }, []);

  /**
   * Reset the game to initial state.
   */
  const resetGame = useCallback(() => {
    setGameState(createInitialState());
  }, []);

  /**
   * Toggle diagonal movement rule.
   */
  const toggleDiagonalMovement = useCallback(() => {
    setGameState((prevState) => ({
      ...prevState,
      ruleVariants: {
        ...prevState.ruleVariants,
        diagonalMovement: !prevState.ruleVariants.diagonalMovement,
      },
    }));
  }, []);

  /**
   * Toggle diagonal win rule.
   */
  const toggleDiagonalWin = useCallback(() => {
    setGameState((prevState) => ({
      ...prevState,
      ruleVariants: {
        ...prevState.ruleVariants,
        diagonalWin: !prevState.ruleVariants.diagonalWin,
      },
    }));
  }, []);

  /**
   * Get legal moves for the currently selected piece.
   */
  const getSelectedPieceLegalMoves = useCallback((): number[] => {
    if (gameState.selectedPiece === null) {
      return [];
    }
    return getLegalMoves(gameState, gameState.selectedPiece);
  }, [gameState]);

  return {
    gameState,
    handleCellClick,
    resetGame,
    toggleDiagonalMovement,
    toggleDiagonalWin,
    getSelectedPieceLegalMoves,
  };
}
