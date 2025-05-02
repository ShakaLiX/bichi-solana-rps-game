import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
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

const emptyState: GameState = {
  id: '', stake: 0, round: 1,
  playerScore: 0, opponentScore: 0,
  playerMove: null, opponentMove: null,
  phase: 'waitingToCommit', roundResult: null, winner: null
};

const GameContext = createContext<any>(null);
export const useGame = () => useContext(GameContext);

export const GameProvider: React.FC<{ children: React.ReactNode; gameId: string }> = ({ children, gameId }) => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [state, setState] = useState<GameState>(emptyState);

  // Trace phase transitions
  useEffect(() => {
    console.log('⏰ PHASE', state.phase, 'ROUND', state.round, 'MOVES', state.playerMove, state.opponentMove);
  }, [state.phase, state.round, state.playerMove, state.opponentMove]);

  // Subscribe to game updates
  useEffect(() => {
    const sub = subscribeToGame(gameId, payload => {
      const d = payload.new;
      const prev = state;
      if (d.status === 'completed' && prev.phase !== 'gameOver') {
        setState(s => ({ ...s, phase: 'gameOver', winner: d.round_result }));
        return;
      }
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
      if (prev.phase === 'waitingToReveal' && d.player1_move && d.player2_move) {
        const meIsP1 = d.creator_wallet === publicKey!.toString();
        const pm = meIsP1 ? d.player1_move : d.player2_move;
        const om = meIsP1 ? d.player2_move : d.player1_move;
        const result = pm === om ? 'tie'
          : (pm === 'rock' && om === 'scissors') || (pm === 'paper' && om === 'rock') || (pm === 'scissors' && om === 'paper')
            ? 'win'
            : 'lose';
        setState(s => ({
          ...s,
          playerMove: pm,
          opponentMove: om,
          roundResult: result,
          phase: 'showResult'
        }));
      }
    });
    return () => sub.unsubscribe();
  }, [gameId, publicKey, state.phase, state.round]);

  // Auto transitions for showResult and gameOver
  useEffect(() => {
    if (state.phase === 'showResult') {
      const t = setTimeout(() => {
        const outcome = state.roundResult === 'tie' ? 'tie'
          : state.roundResult === 'win' ? 'player1_win'
          : 'player2_win';
        updateRoundAndResult(state.id, outcome, state.round + 1);
      }, 3000);
      return () => clearTimeout(t);
    }
    if (state.phase === 'gameOver') {
      (async () => {
        await updateGameState(state.id, { status: 'completed', round_result: state.winner! });
        const winnerKey = new PublicKey(state.winner!);
        const tx = createTransferTransaction(ESCROW_PUBKEY, winnerKey, state.stake * 2);
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
    if (state.phase !== 'waitingToCommit' || !state.playerMove || !publicKey) return;
    await recordMove(state.id, publicKey.toString(), state.playerMove);
    setState(s => ({ ...s, phase: 'waitingToReveal' }));
  };

  return (
    <GameContext.Provider value={{ state, selectMove, commitMove }}>
      {children}
    </GameContext.Provider>
  );
};