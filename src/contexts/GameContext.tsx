import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useToast } from "@/hooks/use-toast";
import supabase, { 
  GameRecord,
  subscribeToGame,
  recordMove,
  updateRoundAndResult,
  updateGameState,
  type RealtimePostgresChangesPayload
} from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { shortenAddress, createTransferTransaction, ESCROW_PUBKEY } from '@/lib/solana';

type MoveType = "rock" | "paper" | "scissors" | null;

interface GameState {
  id: string | null;
  playerPubkey: string | null;
  opponentPubkey: string | null;
  isCreator: boolean;
  stake: number;
  round: number;
  playerScore: number;
  opponentScore: number;
  playerMove: MoveType;
  opponentMove: MoveType;
  playerCommitted: boolean;
  opponentCommitted: boolean;
  roundResult: "win" | "lose" | "tie" | null;
  gameOver: boolean;
  winner: string | null;
  shouldResetTimer: boolean;
}

interface GameContextType {
  gameState: GameState;
  selectMove: (move: MoveType) => void;
  commitMove: () => Promise<void>;
  resetGame: () => void;
  isLoading: boolean;
  resetRoundTimer: () => void;
}

const defaultGameState: GameState = {
  id: null,
  playerPubkey: null,
  opponentPubkey: null,
  isCreator: false,
  stake: 0,
  round: 1,
  playerScore: 0,
  opponentScore: 0,
  playerMove: null,
  opponentMove: null,
  playerCommitted: false,
  opponentCommitted: false,
  roundResult: null,
  gameOver: false,
  winner: null,
  shouldResetTimer: false,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState>(defaultGameState);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [gameRounds, setGameRounds] = useState<{
    [round: number]: {
      playerMove: MoveType;
      opponentMove: MoveType;
    }
  }>({});
  const supabaseSubscription = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset round timer flag
  const resetRoundTimer = useCallback(() => {
    console.log('ROUND RESET: Round timer reset requested');
    setGameState(prev => ({
      ...prev,
      shouldResetTimer: !prev.shouldResetTimer // Toggle to trigger effect
    }));
  }, []);

  // Clear moves and reset timer when round changes
  const clearMovesAndResetTimer = useCallback(() => {
    console.log('Clearing moves and resetting timer');
    setGameState(prev => ({
      ...prev,
      playerMove: null,
      opponentMove: null,
      playerCommitted: false,
      opponentCommitted: false,
      roundResult: null,
      shouldResetTimer: !prev.shouldResetTimer // Toggle to trigger timer reset
    }));
  }, []);

  // Setup timeout for moves - modified to handle timeout logic correctly
  useEffect(() => {
    if (!gameState.id || gameState.gameOver) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Set a timeout for auto-move
    console.log('Setting up timeout for round', gameState.round);
    timeoutRef.current = setTimeout(() => {
      console.log('TIMEOUT: Timer expired for round', gameState.round);
      
      // Handle timeout based on committed moves
      if (gameState.playerCommitted && !gameState.opponentCommitted) {
        // Only player committed - player wins round
        console.log('TIMEOUT: Player committed but opponent did not - player wins round');
        handlePlayerWinsRound();
      } 
      else if (!gameState.playerCommitted && gameState.opponentCommitted) {
        // Only opponent committed - opponent wins round
        console.log('TIMEOUT: Opponent committed but player did not - opponent wins round');
        handleOpponentWinsRound();
      } 
      else if (!gameState.playerCommitted && !gameState.opponentCommitted) {
        // Neither player committed - reset round timer
        console.log('TIMEOUT: No players committed moves - resetting round timer');
        clearMovesAndResetTimer(); // Clear moves and reset timer
        toast({
          title: "Round reset",
          description: "No moves were made. Try again!",
        });
      }
    }, 30000); // 30 seconds timeout

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [gameState.round, gameState.gameOver, gameState.id, gameState.playerCommitted, gameState.opponentCommitted, clearMovesAndResetTimer, toast]);

  // Helper functions for timeout handling
  const handlePlayerWinsRound = useCallback(async () => {
    if (!gameState.id) return;
    
    setGameState(prev => {
      const newPlayerScore = prev.playerScore + 1;
      
      // Check if player won the game
      if (newPlayerScore >= 2) {
        handleGameOver(prev.playerPubkey);
        return {
          ...prev,
          playerScore: newPlayerScore,
          roundResult: "win"
        };
      }
      
      // Continue to next round
      if (prev.isCreator) {
        updateRoundAndResult(
          prev.id!,
          'player1_win',
          prev.round + 1
        );
      }
      
      return {
        ...prev,
        playerScore: newPlayerScore,
        roundResult: "win"
      };
    });
    
    toast({ 
      title: "Round won by timeout!", 
      description: "Your opponent didn't make a move in time."
    });
  }, [gameState.id, toast]);
  
  const handleOpponentWinsRound = useCallback(async () => {
    if (!gameState.id) return;
    
    setGameState(prev => {
      const newOpponentScore = prev.opponentScore + 1;
      
      // Check if opponent won the game
      if (newOpponentScore >= 2) {
        handleGameOver(prev.opponentPubkey);
        return {
          ...prev,
          opponentScore: newOpponentScore,
          roundResult: "lose"
        };
      }
      
      // Continue to next round
      if (prev.isCreator) {
        updateRoundAndResult(
          prev.id!,
          'player2_win',
          prev.round + 1
        );
      }
      
      return {
        ...prev,
        opponentScore: newOpponentScore,
        roundResult: "lose"
      };
    });
    
    toast({ 
      title: "Round lost by timeout!", 
      description: "You didn't make a move in time."
    });
  }, [gameState.id, toast]);

  // Handle game over and payout to winner
  const handleGameOver = useCallback(async (winnerAddress: string | null) => {
    if (!gameState.id || !winnerAddress) return;
    
    console.log('Game over, winner is:', winnerAddress);
    
    // Update game state
    setGameState(prev => ({
      ...prev,
      gameOver: true,
      winner: winnerAddress
    }));
    
    // Only creator performs payout to avoid duplicate transactions
    if (gameState.isCreator && publicKey && sendTransaction && connection) {
      try {
        console.log('Processing payout to winner:', winnerAddress);
        
        // Update game status in Supabase
        await updateGameState(gameState.id, { 
          status: 'completed',
          round_result: winnerAddress
        });
        
        // Calculate total payout (stake amount * 2)
        const totalPayout = gameState.stake * 2;
        
        // Create transaction to transfer from escrow to winner
        const winnerPublicKey = new PublicKey(winnerAddress);
        
        // Send transaction to transfer funds from escrow to winner
        const transaction = await createTransferTransaction(
          ESCROW_PUBKEY,
          winnerPublicKey,
          totalPayout
        );
        
        // Sign and send transaction
        const signature = await sendTransaction(transaction, connection);
        console.log('Payout transaction sent:', signature);
        
        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature);
        console.log('Payout transaction confirmed:', confirmation);
        
      } catch (error) {
        console.error('Error processing payout:', error);
        toast({
          title: "Payout Failed",
          description: "Error processing winner payout. Please contact support.",
          variant: "destructive"
        });
      }
    }
    
    // Determine if current player won
    const playerWon = winnerAddress === gameState.playerPubkey;
    
    // Show toast for game result
    if (playerWon) {
      toast({
        title: "🎉 You won the match!",
        description: `${gameState.stake * 2} SOL has been sent to your wallet.`,
        duration: 5000,
      });
    } else {
      toast({
        title: "Game Over",
        description: "You lost the match. Better luck next time!",
        duration: 5000,
      });
    }
    
    // Return to lobby after delay
    setTimeout(() => {
      navigate('/');
    }, 5000);
  }, [gameState.id, gameState.isCreator, gameState.playerPubkey, gameState.stake, connection, navigate, publicKey, sendTransaction, toast]);

  // Load game data from Supabase
  useEffect(() => {
    const fetchGameData = async () => {
      if (!gameId || !publicKey) return;

      try {
        console.log('Fetching game data for game ID:', gameId);
        
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();
        
        if (error) {
          console.error('Error fetching game data:', error);
          toast({
            title: "Error",
            description: "Could not load game data. Returning to lobby.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
        
        if (!data) {
          console.error('Game not found');
          toast({
            title: "Game Not Found",
            description: "This game doesn't exist. Returning to lobby.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
        
        const walletAddress = publicKey.toString();
        const isCreator = data.creator_wallet === walletAddress;
        const playerPubkey = walletAddress;
        const opponentPubkey = isCreator ? data.joined_wallet : data.creator_wallet;
        
        console.log('Game data loaded:', { 
          data, 
          walletAddress, 
          isCreator, 
          playerPubkey, 
          opponentPubkey,
          current_round: data.current_round
        });
        
        setGameState(prev => ({
          ...prev,
          id: gameId,
          playerPubkey,
          opponentPubkey,
          isCreator,
          stake: data.stake_amount,
          round: data.current_round || 1,
          playerMove: isCreator ? data.player1_move as MoveType : data.player2_move as MoveType,
          opponentMove: isCreator ? data.player2_move as MoveType : data.player1_move as MoveType,
          playerCommitted: isCreator ? !!data.player1_move : !!data.player2_move,
          opponentCommitted: isCreator ? !!data.player2_move : !!data.player1_move,
        }));
        
        // Subscribe to game updates
        subscribeToGameUpdates(gameId);
        
      } catch (err) {
        console.error('Exception fetching game data:', err);
        toast({
          title: "Error",
          description: "An error occurred while loading the game. Returning to lobby.",
          variant: "destructive",
        });
        navigate('/');
      }
    };

    fetchGameData();

    return () => {
      // Clean up subscription on unmount
      if (supabaseSubscription.current) {
        supabaseSubscription.current.unsubscribe();
      }
    };
  }, [gameId, publicKey, navigate, toast]);

  // Subscribe to game updates using Supabase Realtime - FIXED to preserve player's move
  const subscribeToGameUpdates = useCallback((gameId: string) => {
    console.log('Setting up realtime subscription for game updates');
    
    supabaseSubscription.current = subscribeToGame(gameId, (payload: RealtimePostgresChangesPayload<GameRecord>) => {
      if (!payload.new) return;

      const gameData = payload.new as GameRecord;
      
      console.log('Game update received:', gameData);

      // Update local state based on database changes
      setGameState(prev => {
        const isCreator = prev.isCreator;
        
        // Only update opponent's move and commitment status
        // Do NOT overwrite player's own move unless round changes
        const opponentMove = isCreator 
          ? (gameData.player2_move as MoveType) 
          : (gameData.player1_move as MoveType);
        const opponentCommitted = isCreator 
          ? !!gameData.player2_move 
          : !!gameData.player1_move;
        
        // Store current player's move and commitment status to preserve it
        const currentPlayerMove = prev.playerMove;
        const currentPlayerCommitted = prev.playerCommitted;
        
        // Detect round change
        const roundChanged = gameData.current_round !== prev.round;
        
        // Detect if we've received a draw result
        const isDrawResult = gameData.round_result === "tie";
        
        if (roundChanged) {
          console.log('ROUND RESET: Moving to round', gameData.current_round);
          
          // Reset timer on round change
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          // On round change, we DO want to clear player and opponent moves
          return {
            ...prev,
            round: gameData.current_round || prev.round,
            playerMove: null, // Clear player move
            opponentMove: null, // Clear opponent move
            playerCommitted: false, // Reset commitment
            opponentCommitted: false, // Reset commitment
            roundResult: null, // Clear round result
            shouldResetTimer: !prev.shouldResetTimer // Toggle to reset timer
          };
        }
        
        // For draw results, clear both moves and reset timer
        if (isDrawResult && prev.roundResult !== "tie") {
          console.log('DRAW DETECTED: Both players chose the same move');
          
          // Return updated state with both moves cleared
          return {
            ...prev,
            playerMove: null,
            opponentMove: null,
            playerCommitted: false,
            opponentCommitted: false,
            roundResult: "tie",
            shouldResetTimer: !prev.shouldResetTimer
          };
        }
        
        // For normal updates (not round change or draw), preserve player's move
        // Only update opponent's move and round result if provided
        return {
          ...prev,
          playerMove: currentPlayerMove, // Preserve player's move
          opponentMove: opponentMove, // Update opponent's move
          playerCommitted: currentPlayerCommitted, // Preserve player's commitment
          opponentCommitted: opponentCommitted, // Update opponent's commitment
          roundResult: gameData.round_result as "win" | "lose" | "tie" | null || prev.roundResult
        };
      });
      
      // Handle game completion
      if (gameData.status === 'completed') {
        console.log('Game completed, winner:', gameData.round_result);
        handleGameOver(gameData.round_result || null);
      }
    });
  }, [handleGameOver]);

  // Select a move
  const selectMove = useCallback((move: MoveType) => {
    if (!gameState.playerCommitted && !gameState.gameOver) {
      setGameState(prev => ({
        ...prev,
        playerMove: move
      }));
    }
  }, [gameState.playerCommitted, gameState.gameOver]);

  // Commit move and update database
  const commitMove = useCallback(async () => {
    if (!gameState.playerMove || gameState.playerCommitted || gameState.gameOver || !gameState.id || !gameState.playerPubkey) return;
    
    setIsLoading(true);
    
    try {
      console.log('Committing move:', gameState.playerMove);

      // Record move in database
      const success = await recordMove(
        gameState.id,
        gameState.playerPubkey,
        gameState.playerMove,
        gameState.isCreator
      );
      
      if (!success) {
        throw new Error('Failed to record your move');
      }
      
      // Update local state
      setGameState(prev => ({
        ...prev,
        playerCommitted: true
      }));
      
      toast({
        title: "Move Committed",
        description: "Waiting for your opponent to make a move...",
      });
      
      // Clear any timeout - player has moved
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
    } catch (error) {
      console.error('Error committing move:', error);
      toast({
        title: "Move Failed",
        description: "Failed to commit your move. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [gameState.playerMove, gameState.playerCommitted, gameState.gameOver, gameState.id, gameState.playerPubkey, gameState.isCreator, toast]);

  // Check if both players have committed moves and evaluate round
  useEffect(() => {
    const evaluateRoundIfNeeded = async () => {
      // Only the creator evaluates round results to avoid race conditions
      if (!gameState.isCreator || 
          !gameState.id || 
          !gameState.playerCommitted || 
          !gameState.opponentCommitted ||
          gameState.gameOver ||
          gameState.roundResult) {
        return;
      }

      await evaluateRound();
    };

    evaluateRoundIfNeeded();
  }, [gameState.playerCommitted, gameState.opponentCommitted]);

  // Evaluate round result
  const evaluateRound = async () => {
    if (!gameState.playerMove || !gameState.opponentMove || !gameState.id) return;
    
    console.log('Evaluating round result:', { 
      playerMove: gameState.playerMove, 
      opponentMove: gameState.opponentMove 
    });
    
    let roundResult: "win" | "lose" | "tie" | null = null;
    let playerScoreUpdate = 0;
    let opponentScoreUpdate = 0;
    
    // Save the moves for this round
    setGameRounds(prev => ({
      ...prev,
      [gameState.round]: {
        playerMove: gameState.playerMove,
        opponentMove: gameState.opponentMove
      }
    }));
    
    // Determine round result
    if (gameState.playerMove === gameState.opponentMove) {
      roundResult = "tie";
      console.log('DRAW DETECTED: Both players chose', gameState.playerMove);
      
      // Only creator updates database for draws to avoid race conditions
      if (gameState.isCreator) {
        await updateRoundAndResult(
          gameState.id,
          'tie',
          gameState.round + 1
        );
      }
      
      // Clear moves and reset timer for draw
      clearMovesAndResetTimer();
    } else if (
      (gameState.playerMove === "rock" && gameState.opponentMove === "scissors") ||
      (gameState.playerMove === "paper" && gameState.opponentMove === "rock") ||
      (gameState.playerMove === "scissors" && gameState.opponentMove === "paper")
    ) {
      roundResult = "win";
      playerScoreUpdate = 1;
      
      if (gameState.isCreator) {
        // Player wins
        setGameState(prev => {
          const newPlayerScore = prev.playerScore + 1;
          
          // Check if player won the game
          if (newPlayerScore >= 2) {
            handleGameOver(prev.playerPubkey);
          } else {
            // Continue to next round
            updateRoundAndResult(
              prev.id!,
              'player1_win',
              prev.round + 1
            );
          }
          
          return {
            ...prev,
            playerScore: newPlayerScore,
            roundResult
          };
        });
      }
    } else {
      roundResult = "lose";
      opponentScoreUpdate = 1;
      
      if (gameState.isCreator) {
        // Opponent wins
        setGameState(prev => {
          const newOpponentScore = prev.opponentScore + 1;
          
          // Check if opponent won the game
          if (newOpponentScore >= 2) {
            handleGameOver(prev.opponentPubkey);
          } else {
            // Continue to next round
            updateRoundAndResult(
              prev.id!,
              'player2_win',
              prev.round + 1
            );
          }
          
          return {
            ...prev,
            opponentScore: newOpponentScore,
            roundResult
          };
        });
      }
    }
    
    if (!gameState.isCreator) {
      // Non-creator just updates local state
      setGameState(prev => ({
        ...prev,
        playerScore: prev.playerScore + playerScoreUpdate,
        opponentScore: prev.opponentScore + opponentScoreUpdate,
        roundResult
      }));
    }
    
    // Show appropriate toast based on result
    if (roundResult === "tie") {
      toast({ title: "It's a tie!", description: "No points awarded." });
    } else if (roundResult === "win") {
      toast({ 
        title: "You won this round!", 
        description: `${gameState.playerMove} beats ${gameState.opponentMove}` 
      });
    } else {
      toast({ 
        title: "You lost this round!", 
        description: `${gameState.opponentMove} beats ${gameState.playerMove}` 
      });
    }
  };

  // Reset the game state
  const resetGame = () => {
    setGameState(defaultGameState);
  };

  // Watch for round changes to clear moves and reset timer
  useEffect(() => {
    // This effect will trigger when the round changes after subscription updates
    if (gameState.roundResult) {
      const roundResultTimeout = setTimeout(() => {
        // If we have a round result and it's not game over, prepare for next round
        if (!gameState.gameOver) {
          clearMovesAndResetTimer();
        }
      }, 2000); // Short delay to show the result before resetting
      
      return () => clearTimeout(roundResultTimeout);
    }
  }, [gameState.round, gameState.roundResult, gameState.gameOver, clearMovesAndResetTimer]);

  return (
    <GameContext.Provider value={{
      gameState,
      selectMove,
      commitMove,
      resetGame,
      isLoading,
      resetRoundTimer
    }}>
      {children}
    </GameContext.Provider>
  );
};
