// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface GameRecord {
  id: string;
  creator_wallet: string;
  joined_wallet: string | null;
  stake_amount: number;
  status: 'open' | 'joined' | 'completed';
  current_round: number;
  player1_move: string | null;
  player2_move: string | null;
  round_result: string | null;
  created_at: string;
}

export const createGameRecord = (creator: string, stake: number) =>
  supabase
    .from('games')
    .insert({ creator_wallet: creator, stake_amount: stake })
    .select()
    .single();

export const joinGameRecord = (id: string, joiner: string) =>
  supabase
    .from('games')
    .update({ status: 'joined', joined_wallet: joiner })
    .eq('id', id);

export const recordMove = (id: string, player: string, move: string) =>
  supabase.rpc('record_move', { game_id: id, wallet: player, move });

export const updateRoundAndResult = (
  id: string,
  result: string,
  nextRound: number
) =>
  supabase.rpc('advance_round', { game_id: id, round_result: result, next_round: nextRound });

export const subscribeToGame = (
  id: string,
  onEvent: (payload: any) => void
) =>
  supabase
    .channel(`game_${id}`)
    .on(
      'postgres_changes',
      { schema: 'public', table: 'games', filter: `id=eq.${id}` },
      onEvent
    )
    .subscribe();