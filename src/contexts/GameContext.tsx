
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
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
}

interface GameContextType {
  gameState: GameState;
  selectMove: (move: MoveType) => void;
  commitMove: () => Promise<void>;
  resetGame: () => void;
  isLoading: boolean;
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
          opponentPubkey 
        });
        
        setGameState(prev => ({
          ...prev,
          id: gameId,
          playerPubkey,
          opponentPubkey,
          isCreator,
          stake: data.stake_amount,
        }));
        
        // Subscribe to game moves
        subscribeToMoves();
        
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
  }, [gameId, publicKey, navigate, toast]);

  // Subscribe to game moves using Supabase Realtime
  const subscribeToMoves = () => {
    if (!gameId) return;
    
    console.log('Setting up realtime subscription for game moves');
    
    // Create a channel for this specific game
    const channel = supabase
      .channel(`game_moves_${gameId}`)
      .on('broadcast', { event: 'game_move' }, (payload) => {
        console.log('Received game move broadcast:', payload);
        
        const { round, move, wallet } = payload.payload;
        const isOpponentMove = wallet !== gameState.playerPubkey;
        
        if (isOpponentMove) {
          console.log('Opponent made a move:', move);
          // Set opponent move
          setGameState(prev => ({
            ...prev,
            opponentMove: move as MoveType,
            opponentCommitted: true
          }));
          
          // Check if both players have committed moves
          if (gameState.playerCommitted) {
            // Evaluate round result after a short delay
            setTimeout(() => evaluateRound(gameState.playerMove, move as MoveType), 1000);
          }
        }
      })
      .on('broadcast', { event: 'game_over' }, (payload) => {
        console.log('Received game over broadcast:', payload);
        handleGameOver(payload.payload.winner);
      })
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  };

  // Select a move
  const selectMove = (move: MoveType) => {
    if (!gameState.playerCommitted) {
      setGameState(prev => ({
        ...prev,
        playerMove: move
      }));
    }
  };

  // Commit move and broadcast to opponent
  const commitMove = async () => {
    if (!gameState.playerMove || gameState.playerCommitted || !gameState.id || !gameState.playerPubkey) return;
    
    setIsLoading(true);
    
    try {
      console.log('Committing move:', gameState.playerMove);
      
      // Broadcast move to opponent
      const { error } = await supabase
        .channel(`game_moves_${gameState.id}`)
        .send({
          type: 'broadcast',
          event: 'game_move',
          payload: {
            round: gameState.round,
            move: gameState.playerMove,
            wallet: gameState.playerPubkey
          }
        });
      
      if (error) {
        console.error('Error broadcasting move:', error);
        throw new Error('Failed to send your move');
      }
      
      // Update player committed state
      setGameState(prev => ({
        ...prev,
        playerCommitted: true
      }));
      
      toast({
        title: "Move Committed",
        description: "Waiting for your opponent to make a move...",
      });
      
      // Check if opponent has already committed
      if (gameState.opponentCommitted) {
        // Evaluate round result after a short delay
        setTimeout(() => evaluateRound(gameState.playerMove, gameState.opponentMove!), 1000);
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

  // Evaluate round result
  const evaluateRound = (playerMove: MoveType, opponentMove: MoveType) => {
    console.log('Evaluating round result:', { playerMove, opponentMove });
    
    let roundResult: "win" | "lose" | "tie" | null = null;
    let playerScoreUpdate = 0;
    let opponentScoreUpdate = 0;
    
    // Save the moves for this round
    setGameRounds(prev => ({
      ...prev,
      [gameState.round]: {
        playerMove,
        opponentMove
      }
    }));
    
    // Determine round result
    if (playerMove === opponentMove) {
      roundResult = "tie";
      toast({ title: "It's a tie!", description: "No points awarded." });
    } else if (
      (playerMove === "rock" && opponentMove === "scissors") ||
      (playerMove === "paper" && opponentMove === "rock") ||
      (playerMove === "scissors" && opponentMove === "paper")
    ) {
      roundResult = "win";
      playerScoreUpdate = 1;
      toast({ title: "You won this round!", description: `${playerMove} beats ${opponentMove}` });
    } else {
      roundResult = "lose";
      opponentScoreUpdate = 1;
      toast({ title: "You lost this round!", description: `${opponentMove} beats ${playerMove}` });
    }
    
    const newPlayerScore = gameState.playerScore + playerScoreUpdate;
    const newOpponentScore = gameState.opponentScore + opponentScoreUpdate;
    
    setGameState(prev => ({
      ...prev,
      roundResult,
      playerScore: newPlayerScore,
      opponentScore: newOpponentScore,
    }));
    
    // Check for game over
    if (newPlayerScore === 2 || newOpponentScore === 2) {
      // Game is over, determine winner
      setTimeout(() => {
        const winnerAddress = newPlayerScore > newOpponentScore ? gameState.playerPubkey : gameState.opponentPubkey;
        
        // Only creator announces game over to avoid duplicate processing
        if (gameState.isCreator) {
          handleGameOver(winnerAddress);
        }
      }, 1500);
    } else {
      // Continue to next round after a delay
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          round: prev.round + 1,
          playerMove: null,
          opponentMove: null,
          playerCommitted: false,
          opponentCommitted: false,
          roundResult: null
        }));
      }, 3000);
    }
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
        
        // Calculate total payout (stake amount * 2)
        const totalPayout = gameState.stake * 2;
        
        // Create transaction to transfer total from escrow to winner
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
        
        // Update game status in Supabase
        const { error } = await supabase
          .from('games')
          .update({ status: 'completed' })
          .eq('id', gameState.id);
        
        if (error) {
          console.error('Error updating game status:', error);
        }
        
        // Broadcast game over to both players
        supabase
          .channel(`game_moves_${gameState.id}`)
          .send({
            type: 'broadcast',
            event: 'game_over',
            payload: {
              winner: winnerAddress,
              txSignature: signature
            }
          });
        
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
      isLoading
    }}>
      {children}
    </GameContext.Provider>
  );
};
