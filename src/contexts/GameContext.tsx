// src/contexts/GameContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  recordMove,
  updateRoundAndResult,
  updateGameState,
  subscribeToGame
} from '@/lib/supabase';
import { createTransferTransaction, ESCROW_PUBKEY } from '@/lib/solana';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useToast } from '@/hooks/use-toast';

type Phase = 
  | 'waitingToCommit'
  | 'waitingToReveal'
  | 'showResult'
  | 'gameOver';

type MoveType = 'rock'|'paper'|'scissors'|null;

interface GameState {
  id: string;
  stake: number;
  round: number;
  playerScore: number;
  opponentScore: number;
  playerMove: MoveType;
  opponentMove: MoveType;
  phase: Phase;
  roundResult: 'win'|'lose'|'tie'|null;
  winner: string|null;
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
  selectMove: (m: MoveType)=>void;
  commitMove: ()=>Promise<void>;
}>({
  state: EMPTY,
  selectMove:()=>{},
  commitMove:async()=>{}
});

export const useGame = ()=>useContext(GameContext);

export const GameProvider: React.FC<{children:any}> = ({children})=>{
  const { gameId } = useParams<{gameId:string}>();
  const navigate = useNavigate();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  
  const [state, set] = useState<GameState>(EMPTY);
  
  // Initialize from supabase row
  useEffect(()=>{
    if(!gameId || !publicKey) return;
    (async()=>{
      const row = await fetchGameRow(gameId);
      if(!row) return navigate('/');
      set({
        id: row.id,
        stake: row.stake_amount,
        round: row.current_round||1,
        playerScore: row.player1_wins||0,
        opponentScore: row.player2_wins||0,
        playerMove: null,
        opponentMove: null,
        phase: 'waitingToCommit',
        roundResult: null,
        winner: null
      });
      // subscribe
      subscribeToGame(gameId, onPayload);
    })();
  },[gameId,publicKey]);
  
  // Handler for real-time updates
  const onPayload = useCallback(async (payload:any)=>{
    const d = payload.new;
    // if joined → no effect here
    // if current_round changed or round_result changed → handle next
    if(d.current_round > state.round) {
      // new round started
      set(s=>({
        ...s,
        round: d.current_round,
        phase: 'waitingToCommit',
        playerMove: null,
        opponentMove: null,
        roundResult: null
      }));
      return;
    }
    // both moves in? reveal:
    if(d.player1_move && d.player2_move && state.phase==='waitingToCommit'){
      const meIsP1 = d.creator_wallet === publicKey!.toString();
      const pm = meIsP1?d.player1_move:d.player2_move;
      const om = meIsP1?d.player2_move:d.player1_move;
      const result = pm===om?'tie':
        (pm==='rock'&&om==='scissors')||(pm==='paper'&&om==='rock')||(pm==='scissors'&&om==='paper')
        ?'win':'lose';
      set(s=>({
        ...s,
        playerMove: pm as MoveType,
        opponentMove: om as MoveType,
        roundResult: result,
        phase: 'showResult'
      }));
    }
    // game over?
    if(d.status==='completed'){
      set(s=>({
        ...s, phase:'gameOver', winner:d.round_result
      }));
    }
  },[state, publicKey]);
  
  // Phase auto-transitions
  useEffect(()=>{
    if(state.phase==='showResult'){
      const t = setTimeout(()=>{ 
        if(state.roundResult!=='tie'){
          // advance DB state
          updateRoundAndResult(state.id,
            state.roundResult==='win'?'player1_win':'player2_win',
            state.round+1
          );
        } else {
          updateRoundAndResult(state.id,'tie',state.round+1);
        }
      },3000);
      return ()=>clearTimeout(t);
    }
    if(state.phase==='gameOver'){
      payout();
      setTimeout(()=>navigate('/'),5000);
    }
  },[state.phase]);
  
  const selectMove = (m:MoveType)=>{
    if(state.phase!=='waitingToCommit') return;
    set(s=>({...s,playerMove:m}));
  };
  
  const commitMove = async ()=>{
    if(state.phase!=='waitingToCommit'||!state.playerMove) return;
    await recordMove(state.id,
      publicKey!.toString(),
      state.playerMove,
      state.playerPubkey===state.creator_wallet
    );
    set(s=>({...s,phase:'waitingToReveal'}));
  };
  
  // payout from escrow
  const payout = async ()=>{
    const winnerKey = new PublicKey(state.winner!);
    const tx = await createTransferTransaction(
      ESCROW_PUBKEY,
      winnerKey,
      state.stake*2
    );
    const sig = await sendTransaction(tx,connection);
    toast({title:'Payout sent',description:sig});
  };
  
  return <GameContext.Provider value={{
    state,selectMove,commitMove
  }}>{children}</GameContext.Provider>;
};
