
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useToast } from "@/hooks/use-toast";

type MoveType = "rock" | "paper" | "scissors" | null;

interface GameState {
  id: string | null;
  playerPubkey: string | null;
  opponentPubkey: string | null;
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
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState>(defaultGameState);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // In a real implementation, we would initialize the game state from blockchain data
  useEffect(() => {
    // This would be replaced with fetching game data from blockchain
    const initGameFromBlockchain = async () => {
      if (publicKey) {
        // For now, we'll use default values with the real public key
        setGameState(prev => ({
          ...prev,
          playerPubkey: publicKey.toString(),
          // In a real implementation, these would come from the blockchain
          id: "game123",
          opponentPubkey: "3j5n9k2mDzP8C6VEjkpQZ7wBrNa1X9HbKoJg7K8T",
          stake: 0.2,
        }));
      }
    };

    initGameFromBlockchain();
  }, [publicKey]);

  // Select a move
  const selectMove = (move: MoveType) => {
    if (!gameState.playerCommitted) {
      setGameState(prev => ({
        ...prev,
        playerMove: move
      }));
    }
  };

  // Commit a move to the blockchain
  const commitMove = async () => {
    if (!gameState.playerMove || gameState.playerCommitted) return;
    
    setIsLoading(true);
    
    try {
      // In a real implementation, we would:
      // 1. Hash the move with a secret
      // 2. Send the hash to the blockchain
      // 3. Wait for confirmation
      
      // For now, we'll simulate the transaction
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          playerCommitted: true
        }));
        
        toast({
          title: "Move Committed",
          description: "Waiting for your opponent to make a move...",
        });
        
        // Simulate opponent committing after a random delay
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            opponentCommitted: true
          }));
          
          // Reveal moves and determine result after both committed
          setTimeout(revealMoves, 1000);
        }, Math.random() * 5000 + 1000);
        
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error committing move:', error);
      toast({
        title: "Transaction Failed",
        description: "Failed to commit your move. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Reveal moves and determine winner
  const revealMoves = () => {
    // In a real implementation, both players would reveal their moves and the contract would verify
    // For now, we'll simulate the opponent's move
    
    const moves: MoveType[] = ["rock", "paper", "scissors"];
    const randomMove = moves[Math.floor(Math.random() * moves.length)] as MoveType;
    
    let roundResult: "win" | "lose" | "tie" | null = null;
    let playerScoreUpdate = 0;
    let opponentScoreUpdate = 0;
    
    // Determine round result
    if (gameState.playerMove === randomMove) {
      roundResult = "tie";
      toast({ title: "It's a tie!", description: "No points awarded." });
    } else if (
      (gameState.playerMove === "rock" && randomMove === "scissors") ||
      (gameState.playerMove === "paper" && randomMove === "rock") ||
      (gameState.playerMove === "scissors" && randomMove === "paper")
    ) {
      roundResult = "win";
      playerScoreUpdate = 1;
      toast({ title: "You won this round!", description: `${gameState.playerMove} beats ${randomMove}` });
    } else {
      roundResult = "lose";
      opponentScoreUpdate = 1;
      toast({ title: "You lost this round!", description: `${randomMove} beats ${gameState.playerMove}` });
    }
    
    const newPlayerScore = gameState.playerScore + playerScoreUpdate;
    const newOpponentScore = gameState.opponentScore + opponentScoreUpdate;
    
    setGameState(prev => ({
      ...prev,
      opponentMove: randomMove,
      roundResult,
      playerScore: newPlayerScore,
      opponentScore: newOpponentScore,
    }));
    
    // Check for game over
    if (newPlayerScore === 2 || newOpponentScore === 2) {
      // Game is over, determine winner
      setTimeout(() => {
        const winner = newPlayerScore > newOpponentScore ? gameState.playerPubkey : gameState.opponentPubkey;
        
        setGameState(prev => ({
          ...prev,
          gameOver: true,
          winner
        }));
        
        // Show toast for game result
        if (winner === gameState.playerPubkey) {
          toast({
            title: "🎉 You won the match!",
            description: "Your reward has been transferred to your wallet.",
            duration: 5000,
          });
        } else {
          toast({
            title: "Game Over",
            description: "You lost the match. Better luck next time!",
            duration: 5000,
          });
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
