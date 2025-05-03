// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

// Using hardcoded values since we're getting errors with import.meta.env
// These should match your Supabase project settings
const SUPABASE_URL = 'https://uuhdluysciuxzswveaqx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1aGRsdXlzY2l1eHpzd3ZlYXF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMTAwMzUsImV4cCI6MjA2MTc4NjAzNX0.LFa32-oU0cFhlbsANmnS5Y9_3cqT6SnxK4QYLM527tU';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// Shape of a game row
export interface GameRecord {
  id: string;
  creator_wallet: string;
  joined_wallet: string | null;
  status: 'open' | 'joined' | 'completed';
  stake_amount: number;
  current_round: number;
}

// Fetch all open games
export async function fetchOpenGames(): Promise<GameRecord[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchOpenGames error:', error);
    return [];
  }
  return data as GameRecord[];
}

// Fetch one game by ID
export async function fetchGameData(id: string): Promise<GameRecord | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('fetchGameData error:', error);
    return null;
  }
  return data as GameRecord;
}

// Create a new game record
export async function createGameRecord(
  creator_wallet: string,
  stake_amount: number
): Promise<GameRecord | null> {
  const { data, error } = await supabase
    .from('games')
    .insert({
      creator_wallet,
      stake_amount,
      status: 'open'
    })
    .select()
    .single();
  if (error) {
    console.error('createGameRecord error:', error);
    return null;
  }
  return data as GameRecord;
}

// Mark a game as joined by a second player
export async function joinGameRecord(
  id: string,
  joined_wallet: string
): Promise<boolean> {
  const { error } = await supabase
    .from('games')
    .update({ joined_wallet, status: 'joined' })
    .eq('id', id);
  if (error) {
    console.error('joinGameRecord error:', error);
    return false;
  }
  return true;
}

// Update round result & next round
export async function updateRoundAndResult(
  id: string,
  round_result: 'player1_win' | 'player2_win' | 'tie',
  current_round: number
) {
  const { error } = await supabase
    .from('games')
    .update({ round_result, current_round })
    .eq('id', id);
  if (error) console.error('updateRoundAndResult error:', error);
}

// Update final game state
export async function updateGameState(
  id: string,
  attrs: { status: 'completed'; round_result: string }
) {
  const { error } = await supabase
    .from('games')
    .update(attrs)
    .eq('id', id);
  if (error) console.error('updateGameState error:', error);
}
