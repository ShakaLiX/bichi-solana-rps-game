
// src/contexts/GameContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { PublicKey } from '@solana/web3.js';
import { useToast } from '@/hooks/use-toast';
import supabase from '@/lib/supabase';
import {
  updateRoundAndResult,
  updateGameState
} from '@/lib/supabase';
import { createTransferTransaction, ESCROW_PUBKEY } from '@/lib/solana';

type MoveType = 'rock' | 'paper' | 'scissors' | null;
type Phase = 'waitingToCommit' | 'showResult' | 'gameOver';

interface GameState {
  id: string;
  stake: number;
  round: number;
  playerScore: number;
  opponentScore: number;
  playerMove: MoveType;
  opponentMove: MoveType;
  playerCommitted: boolean;
  opponentCommitted: boolean;
  roundResult: 'win' | 'lose' | 'tie' | null;
  isCreator: boolean;
  playerPubkey: string | null;
  opponentPubkey: string | null;
  phase: Phase;
  winner: string | null;
}

const EMPTY: GameState = {
  id: '',
  stake: 0,
  round: 1,
  playerScore: 0,
  opponentScore: 0,
  playerMove: null,
  opponentMove: null,
  playerCommitted: false,
  opponentCommitted: false,
  roundResult: null,
  isCreator: false,
  playerPubkey: null,
  opponentPubkey: null,
  phase: 'waitingToCommit',
  winner: null
};

const GameContext = createContext<{
  state: GameState;
  selectMove: (m: MoveType) => void;
  commitMove: () => Promise<void>;
}>(null!);

export const useGame = () => useContext(GameContext);

export const GameProvider: React.FC<{ children: React.ReactNode; gameId: string }> = ({
  children,
  gameId
}) => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [state, setState] = useState<GameState>(EMPTY);

  // Debug logging
  useEffect(() => {
    console.log(
      '⏰ PHASE', state.phase,
      'ROUND', state.round,
      'SCORE', state.playerScore, '-', state.opponentScore,
      'MOVES', state.playerMove, state.opponentMove
    );
  }, [state]);

  // Subscribe to moves and game_over events
  useEffect(() => {
    if (!gameId) return;
    const channel = supabase
      .channel(`game_moves_${gameId}`)
      .on('broadcast', { event: 'game_move' }, ({ payload }) => {
        const { round, move, wallet } = payload as any;
        setState(prev => {
          if (round !== prev.round) return prev;
          if (wallet === prev.playerPubkey) return prev; // ignore our own
          const updated = {
            ...prev,
            opponentMove: move as MoveType,
            opponentCommitted: true
          };
          if (prev.playerCommitted && prev.playerMove) {
            setTimeout(() => evaluateRound(prev.playerMove, move as MoveType), 500);
          }
          return updated;
        });
      })
      .on('broadcast', { event: 'game_over' }, ({ payload }) => {
        const winner = (payload as any).winner as string;
        handleGameOver(winner);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [gameId]);

  // Commit local move
  const commitMove = async () => {
    if (!state.playerMove || state.playerCommitted || !publicKey) return;
    setState(prev => ({ ...prev, playerCommitted: true }));
    await supabase
      .channel(`game_moves_${state.id}`)
      .send({
        type: 'broadcast',
        event: 'game_move',
        payload: {
          round: state.round,
          move: state.playerMove,
          wallet: publicKey.toString()
        }
      });
    toast({ title: 'Move Committed', description: 'Waiting for opponent...' });
    // If opponent already in, evaluate
    setState(prev => {
      if (prev.opponentCommitted && prev.opponentMove) {
        setTimeout(() => evaluateRound(prev.playerMove!, prev.opponentMove!), 500);
      }
      return prev;
    });
  };

  // Evaluate a round
  const evaluateRound = (playerMove: MoveType, opponentMove: MoveType) => {
    let result: 'win' | 'lose' | 'tie' = 'tie';
    let ps = 0, os = 0;
    if (playerMove === opponentMove) {
      toast({ title: "It's a tie!", description: 'No points.' });
    } else if (
      (playerMove === 'rock' && opponentMove === 'scissors') ||
      (playerMove === 'paper' && opponentMove === 'rock') ||
      (playerMove === 'scissors' && opponentMove === 'paper')
    ) {
      result = 'win'; ps = 1;
      toast({ title: 'You win this round!', description: `${playerMove} beats ${opponentMove}` });
    } else {
      result = 'lose'; os = 1;
      toast({ title: 'You lose this round', description: `${opponentMove} beats ${playerMove}` });
    }
    setState(prev => ({
      ...prev,
      roundResult: result,
      playerScore: prev.playerScore + ps,
      opponentScore: prev.opponentScore + os,
      phase: 'showResult'
    }));

    const newPS = state.playerScore + ps;
    const newOS = state.opponentScore + os;

    // End or advance
    if (newPS === 2 || newOS === 2) {
      const winnerAddr = newPS > newOS ? state.playerPubkey! : state.opponentPubkey!;
      if (state.isCreator) setTimeout(() => handleGameOver(winnerAddr), 1500);
    } else if (state.round === 3) {
      console.log('Match tied after 3 rounds');
      if (state.isCreator) {
        supabase.channel(`game_moves_${state.id}`)
          .send({ type: 'broadcast', event: 'game_over', payload: { winner: null } });
      }
    } else {
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          round: prev.round + 1,
          playerCommitted: false,
          opponentCommitted: false,
          playerMove: null,
          opponentMove: null,
          roundResult: null,
          phase: 'waitingToCommit'
        }));
      }, 3000);
    }
  };

  // Handle final payout/game over
  const handleGameOver = async (winnerAddr: string | null) => {
    setState(prev => ({ ...prev, phase: 'gameOver', winner: winnerAddr }));
    if (state.isCreator && winnerAddr && publicKey) {
      await updateGameState(state.id, { status: 'completed', round_result: winnerAddr });
      const tx = await createTransferTransaction(ESCROW_PUBKEY, new PublicKey(winnerAddr), state.stake * 2);
      const sig = await sendTransaction(tx, connection);
      toast({ title: 'Payout', description: sig });
      setTimeout(() => navigate('/'), 5000);
    }
  };

  // Select a move
  const selectMove = (m: MoveType) => {
    if (state.phase !== 'waitingToCommit') return;
    setState(prev => ({ ...prev, playerMove: m }));
  };

  // Initialize context state on mount
  useEffect(() => {
    setState(prev => ({
      ...prev,
      id: gameId,
      playerPubkey: publicKey?.toString() || null,
      isCreator: !!publicKey && publicKey.toString() === prev.playerPubkey,
    }));
  }, [gameId, publicKey]);

  return (
    <GameContext.Provider value={{ state, selectMove, commitMove }}>
      {children}
    </GameContext.Provider>
  );
};
