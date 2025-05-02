
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
  RealtimePostgresChangesPayload
} from "@/lib/supabase";
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

  // Setup timeout for moves
  useEffect(() => {
    if (!gameState.id || gameState.playerCommitted || gameState.gameOver) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Set a timeout for auto-move
    console.log('Setting up timeout for auto-move for round', gameState.round);
    timeoutRef.current = setTimeout(() => {
      console.log('TIMEOUT: Auto-selecting move due to timeout');
      // Auto-select rock if player hasn't moved
      if (!gameState.playerCommitted) {
        // Auto select rock
        selectMove("rock");
        commitMove();
        toast({
          title: "Time's up!",
          description: "Rock was automatically selected",
          variant: "destructive"
        });
      }
    }, 30000); // 30 seconds timeout

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [gameState.round, gameState.playerCommitted, gameState.gameOver, gameState.id]);

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

  // Subscribe to game updates using Supabase Realtime
  const subscribeToGameUpdates = (gameId: string) => {
    console.log('Setting up realtime subscription for game updates');
    
    supabaseSubscription.current = subscribeToGame(gameId, (payload: RealtimePostgresChangesPayload<GameRecord>) => {
      if (!payload.new) return;

      const gameData = payload.new;
      const isCreator = gameState.isCreator;
      
      console.log('Game update received:', gameData);

      // Update local state based on database changes
      setGameState(prev => {
        // Extract player and opponent moves based on creator status
        const playerMove = isCreator ? gameData.player1_move as MoveType : gameData.player2_move as MoveType;
        const opponentMove = isCreator ? gameData.player2_move as MoveType : gameData.player1_move as MoveType;
        const playerCommitted = isCreator ? !!gameData.player1_move : !!gameData.player2_move;
        const opponentCommitted = isCreator ? !!gameData.player2_move : !!gameData.player1_move;
        
        // Detect round change
        const roundChanged = gameData.current_round !== prev.round;
        if (roundChanged) {
          console.log('ROUND RESET: Moving to round', gameData.current_round);
          
          // Reset timer on round change
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        }

        // Both players have committed moves, check for result
        const bothCommitted = playerCommitted && opponentCommitted;
        
        // Check for a draw
        const isDraw = bothCommitted && playerMove === opponentMove;
        if (isDraw) {
          console.log('DRAW DETECTED: Both players chose', playerMove);
          toast({
            title: "It's a draw!",
            description: `Both players chose ${playerMove}. Next round starting...`,
            duration: 3000,
          });
        }

        // Ensure draw comparison works correctly
        const isDrawResult = gameData.round_result === "tie";

        return {
          ...prev,
          round: gameData.current_round || prev.round,
          playerMove,
          opponentMove,
          playerCommitted,
          opponentCommitted,
          roundResult: gameData.round_result as "win" | "lose" | "tie" | null || prev.roundResult,
          shouldResetTimer: roundChanged || (isDraw && !isDrawResult)
        };
      });
      
      // Handle game completion
      if (gameData.status === 'completed') {
        console.log('Game completed, winner:', gameData.round_result);
        handleGameOver(gameData.round_result || null);
      }
    });
  };

  // Select a move
  const selectMove = (move: MoveType) => {
    if (!gameState.playerCommitted && !gameState.gameOver) {
      setGameState(prev => ({
        ...prev,
        playerMove: move
      }));
    }
  };

  // Commit move and update database
  const commitMove = async () => {
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
  };

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
    
    // Reset round timer
    resetRoundTimer();
  };
  
  // Handle game over and payout to winner
  const handleGameOver = async (winnerAddress: string | null) => {
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
  };

  // Reset the game state
  const resetGame = () => {
    setGameState(defaultGameState);
  };

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
