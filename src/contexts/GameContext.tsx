// src/contexts/GameContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { PublicKey } from '@solana/web3.js';
import { useToast } from '@/hooks/use-toast';
import {
  recordMove,
  updateRoundAndResult,
  updateGameState,
  subscribeToGame
} from '@/lib/supabase';
import { createTransferTransaction, ESCROW_PUBKEY } from '@/lib/solana';

type MoveType = 'rock' | 'paper' | 'scissors' | null;
type Phase = 'waitingToCommit' | 'waitingToReveal' | 'showResult' | 'gameOver';

interface GameState {
  id: string;
  stake: number;
  round: number;
  playerScore: number;
  opponentScore: number;
  playerMove: MoveType;
  opponentMove: MoveType;
  phase: Phase;
  roundResult: 'win' | 'lose' | 'tie' | null;
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
  phase: 'waitingToCommit',
  roundResult: null,
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

  // Debug: phase transitions
  useEffect(() => {
    console.log(
      '⏰ PHASE', state.phase,
      'ROUND', state.round,
      'SCORE', state.playerScore, '-', state.opponentScore,
      'MOVES', state.playerMove, state.opponentMove
    );
  }, [state]);

  // Subscribe only to this game’s row
  useEffect(() => {
    const sub = subscribeToGame(gameId, payload => {
      const d = payload.new;
      const prev = state;

      // 1️⃣ Game Over?
      if (d.status === 'completed' && prev.phase !== 'gameOver') {
        setState(s => ({ ...s, phase: 'gameOver', winner: d.round_result }));
        return;
      }

      // 2️⃣ New Round?
      if (d.current_round > prev.round) {
        setState(s => ({
          ...s,
          round: d.current_round,
          phase: 'waitingToCommit',
          playerMove: null,
          opponentMove: null,
          roundResult: null
        }));
        return;
      }

      // 3️⃣ Reveal Moves & Update Scores
      if (
        prev.phase === 'waitingToReveal' &&
        d.player1_move != null &&
        d.player2_move != null
      ) {
        const meIsP1 = d.creator_wallet === publicKey!.toString();
        const pm = meIsP1 ? d.player1_move : d.player2_move;
        const om = meIsP1 ? d.player2_move : d.player1_move;
        let result: 'win'|'lose'|'tie' = 'tie';
        if (pm !== om) {
          result =
            (pm === 'rock' && om === 'scissors') ||
            (pm === 'paper' && om === 'rock') ||
            (pm === 'scissors' && om === 'paper')
              ? 'win'
              : 'lose';
        }

        setState(s => ({
          ...s,
          playerMove: pm,
          opponentMove: om,
          roundResult: result,
          // increment the correct score
          playerScore: s.playerScore + (result === 'win' ? 1 : 0),
          opponentScore: s.opponentScore + (result === 'lose' ? 1 : 0),
          phase: 'showResult'
        }));
      }
    });

    return () => sub.unsubscribe();
  }, [gameId, publicKey, state]);

  // Auto‐advance & Payout
  useEffect(() => {
    if (state.phase === 'showResult') {
      const t = setTimeout(() => {
        const outcome =
          state.roundResult === 'tie' ? 'tie' :
          state.roundResult === 'win' ? 'player1_win' : 'player2_win';
        updateRoundAndResult(state.id, outcome, state.round + 1);
      }, 3000);
      return () => clearTimeout(t);
    }

    if (state.phase === 'gameOver') {
      (async () => {
        await updateGameState(state.id, {
          status: 'completed',
          round_result: state.winner!
        });
        const winnerKey = new PublicKey(state.winner!);
        const tx = createTransferTransaction(
          ESCROW_PUBKEY,
          winnerKey,
          state.stake * 2
        );
        const sig = await sendTransaction(tx, connection);
        toast({ title: 'Payout', description: sig });
        setTimeout(() => navigate('/'), 5000);
      })();
    }
  }, [state.phase]);

  const selectMove = (m: MoveType) => {
    if (state.phase !== 'waitingToCommit') return;
    setState(s => ({ ...s, playerMove: m }));
  };

  const commitMove = async () => {
    if (
      state.phase !== 'waitingToCommit' ||
      !state.playerMove ||
      !publicKey
    ) return;
    await recordMove(state.id, publicKey.toString(), state.playerMove);
    setState(s => ({ ...s, phase: 'waitingToReveal' }));
  };

  return (
    <GameContext.Provider value={{ state, selectMove, commitMove }}>
      {children}
    </GameContext.Provider>
  );
};
