"use client";

/**
 * Three Men's Morris Game State Management Hook
 *
 * Custom React hook that manages all game state and provides actions
 * for game interaction. Uses React hooks only (no external state libraries).
 */

import { useState, useCallback } from "react";
import { GameState, Player, createInitialState } from "@/types/game";
import {
  checkWinner,
  isValidPlacement,
  isValidMovement,
  getLegalMoves,
  hasLegalMoves,
  isPlacementComplete,
  getOpponent,
  getAdjacentCells,
} from "@/utils/gameLogic";

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
    if (state.status === "won") {
      return `🎉 Player ${state.winner} wins!`;
    }

    if (state.status === "draw") {
      return "It's a draw! No valid moves available.";
    }

    const playerName = `Player ${state.currentPlayer}`;

    if (state.phase === "placement") {
      const remaining = 3 - state.piecesPlaced[state.currentPlayer];
      return `${playerName}'s turn - Place a piece (${remaining} remaining)`;
    }

    if (state.selectedPiece !== null) {
      return `${playerName}'s turn - Select destination (or click piece again to deselect)`;
    }

    return `${playerName}'s turn - Select a piece to move`;
  }, []);

  /**
   * Handle cell click with validation, messaging, and phase-aware routing.
   */
  const handleCellClick = useCallback(
    (cellIndex: number) => {
      setGameState((prevState) => {
        // Disallow interaction after game end
        if (prevState.status !== "playing") {
          return {
            ...prevState,
            message: "Game over. Reset to play again.",
          };
        }

        // Placement phase
        if (prevState.phase === "placement") {
          if (!isValidPlacement(prevState, cellIndex)) {
            const occupied = prevState.board[cellIndex] !== null;
            return {
              ...prevState,
              message: occupied
                ? "Invalid placement: cell is occupied."
                : "Invalid placement for this phase.",
            };
          }

          const newBoard = [...prevState.board];
          newBoard[cellIndex] = prevState.currentPlayer;

          const newPiecesPlaced = {
            ...prevState.piecesPlaced,
            [prevState.currentPlayer]:
              prevState.piecesPlaced[prevState.currentPlayer] + 1,
          };

          const winner = checkWinner(
            newBoard,
            prevState.ruleVariants.diagonalWin,
          );
          if (winner) {
            const finalState: GameState = {
              ...prevState,
              board: newBoard,
              piecesPlaced: newPiecesPlaced,
              status: "won",
              winner,
              selectedPiece: null,
              message: "",
            };
            return { ...finalState, message: getMessage(finalState) };
          }

          const placementComplete = isPlacementComplete(newPiecesPlaced);
          const nextPlayer = getOpponent(prevState.currentPlayer);
          const nextPhase = placementComplete ? "movement" : "placement";

          const intermediateState: GameState = {
            ...prevState,
            board: newBoard,
            piecesPlaced: newPiecesPlaced,
            currentPlayer: nextPlayer,
            phase: nextPhase,
            selectedPiece: null,
            message: "",
          };

          if (nextPhase === "movement" && !hasLegalMoves(intermediateState)) {
            const drawState = {
              ...intermediateState,
              status: "draw" as const,
              message: "It's a draw! No valid moves available.",
            };
            return drawState;
          }

          return {
            ...intermediateState,
            message: getMessage(intermediateState),
          };
        }

        // Movement phase
        const clickedCell = prevState.board[cellIndex];

        // No piece selected yet: must pick own piece with moves
        if (prevState.selectedPiece === null) {
          if (clickedCell === prevState.currentPlayer) {
            const legalMoves = getLegalMoves(prevState, cellIndex);
            if (legalMoves.length > 0) {
              const selectedState = {
                ...prevState,
                selectedPiece: cellIndex,
                message: getMessage({ ...prevState, selectedPiece: cellIndex }),
              };
              return selectedState;
            }
            return {
              ...prevState,
              message: "No legal moves for that piece.",
            };
          }
          return {
            ...prevState,
            message: "Select one of your own pieces to move.",
          };
        }

        // Clicking the same piece deselects
        if (cellIndex === prevState.selectedPiece) {
          const deselectedState = {
            ...prevState,
            selectedPiece: null,
            message: getMessage({ ...prevState, selectedPiece: null }),
          };
          return deselectedState;
        }

        // Switching selection to another own piece
        if (clickedCell === prevState.currentPlayer) {
          const legalMoves = getLegalMoves(prevState, cellIndex);
          if (legalMoves.length > 0) {
            const newSelection = {
              ...prevState,
              selectedPiece: cellIndex,
              message: getMessage({ ...prevState, selectedPiece: cellIndex }),
            };
            return newSelection;
          }
          return {
            ...prevState,
            message: "No legal moves for that piece.",
          };
        }

        // Attempting to move to a target cell
        if (!isValidMovement(prevState, prevState.selectedPiece, cellIndex)) {
          const occupied = prevState.board[cellIndex] !== null;
          const adjacent =
            prevState.selectedPiece !== null
              ? getAdjacentCells(
                  prevState.selectedPiece,
                  prevState.ruleVariants.diagonalMovement,
                ).includes(cellIndex)
              : false;
          const reason = occupied
            ? "Invalid move: destination occupied."
            : adjacent
              ? "Invalid move for this phase."
              : "Invalid move: destination must be adjacent.";
          return {
            ...prevState,
            message: reason,
          };
        }

        // Execute the move
        const newBoard = [...prevState.board];
        newBoard[prevState.selectedPiece] = null;
        newBoard[cellIndex] = prevState.currentPlayer;

        const winner = checkWinner(
          newBoard,
          prevState.ruleVariants.diagonalWin,
        );
        if (winner) {
          const finalState: GameState = {
            ...prevState,
            board: newBoard,
            selectedPiece: null,
            status: "won",
            winner,
            message: "",
          };
          return { ...finalState, message: getMessage(finalState) };
        }

        const nextPlayer = getOpponent(prevState.currentPlayer);
        const nextState: GameState = {
          ...prevState,
          board: newBoard,
          currentPlayer: nextPlayer,
          selectedPiece: null,
          message: "",
        };

        if (!hasLegalMoves(nextState)) {
          const drawState = {
            ...nextState,
            status: "draw" as const,
            message: "It's a draw! No valid moves available.",
          };
          return drawState;
        }

        return { ...nextState, message: getMessage(nextState) };
      };);
    },
    [getMessage],
  );

  /**
   * Reset the game to initial state.
   */
  const resetGame = useCallback(() => {
    setGameState(createInitialState());
  }, []);

  /**
   * Toggle diagonal movement rule and reconcile state.
   */
  const toggleDiagonalMovement = useCallback(() => {
    setGameState((prevState) => {
      const newRuleVariants = {
        ...prevState.ruleVariants,
        diagonalMovement: !prevState.ruleVariants.diagonalMovement,
      };

      const recomputedWinner = checkWinner(
        prevState.board,
        newRuleVariants.diagonalWin,
      );

      let nextStatus: GameState["status"] = prevState.status;
      let nextWinner: Player | null = prevState.winner;

      if (recomputedWinner) {
        nextStatus = "won";
        nextWinner = recomputedWinner;
      } else if (prevState.status === "won") {
        nextStatus = "playing";
        nextWinner = null;
      }

      const interimState: GameState = {
        ...prevState,
        ruleVariants: newRuleVariants,
        status: nextStatus,
        winner: nextWinner,
        message: "",
      };

      const playableNow =
        interimState.phase === "movement" && hasLegalMoves(interimState);

      if (interimState.status === "draw" && playableNow) {
        const resumedState = {
          ...interimState,
          status: "playing" as const,
          message: "",
        };
        return { ...resumedState, message: getMessage(resumedState) };
      }

      if (
        interimState.status === "playing" &&
        interimState.phase === "movement" &&
        !hasLegalMoves(interimState)
      ) {
        const drawState = {
          ...interimState,
          status: "draw" as const,
          message: "It's a draw! No valid moves available.",
        };
        return drawState;
      }

      return { ...interimState, message: getMessage(interimState) };
    });
  }, [getMessage]);

  /**
   * Toggle diagonal win rule and reconcile state.
   */
  const toggleDiagonalWin = useCallback(() => {
    setGameState((prevState) => {
      const newRuleVariants = {
        ...prevState.ruleVariants,
        diagonalWin: !prevState.ruleVariants.diagonalWin,
      };

      const recomputedWinner = checkWinner(
        prevState.board,
        newRuleVariants.diagonalWin,
      );

      let nextStatus: GameState["status"] = prevState.status;
      let nextWinner: Player | null = prevState.winner;

      if (recomputedWinner) {
        nextStatus = "won";
        nextWinner = recomputedWinner;
      } else if (prevState.status === "won") {
        nextStatus = "playing";
        nextWinner = null;
      }

      const interimState: GameState = {
        ...prevState,
        ruleVariants: newRuleVariants,
        status: nextStatus,
        winner: nextWinner,
        message: "",
      };

      const playableNow =
        interimState.phase === "movement" && hasLegalMoves(interimState);

      if (interimState.status === "draw" && playableNow) {
        const resumedState = {
          ...interimState,
          status: "playing" as const,
          message: "",
        };
        return { ...resumedState, message: getMessage(resumedState) };
      }

      if (
        interimState.status === "playing" &&
        interimState.phase === "movement" &&
        !hasLegalMoves(interimState)
      ) {
        const drawState = {
          ...interimState,
          status: "draw" as const,
          message: "It's a draw! No valid moves available.",
        };
        return drawState;
      }

      return { ...interimState, message: getMessage(interimState) };
    });
  }, [getMessage]);

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
