
// Use the Supabase client that Lovable has already configured
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
export default supabase;
export { RealtimePostgresChangesPayload };

// Types for our games table
export interface GameRecord {
  id: string;
  creator_wallet: string;
  stake_amount: number;
  status: 'open' | 'joined' | 'completed';
  created_at: string;
  joined_wallet?: string;
  current_round?: number;
  player1_move?: string;
  player2_move?: string;
  round_result?: string;
  last_update?: string;
}

// Function to insert a new game
export const createGameRecord = async (
  creator_wallet: string,
  stake_amount: number
): Promise<GameRecord | null> => {
  try {
    console.log('Creating game record in Supabase:', { creator_wallet, stake_amount });
    
    const { data, error } = await supabase
      .from('games')
      .insert({
        creator_wallet,
        stake_amount,
        status: 'open',
        current_round: 1,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating game record:', error);
      return null;
    }
    
    console.log('Game record created successfully:', data);
    return data as GameRecord;
  } catch (error) {
    console.error('Exception creating game record:', error);
    return null;
  }
};

// Function to fetch all open games
export const fetchOpenGames = async (): Promise<GameRecord[]> => {
  try {
    console.log('Fetching open games from Supabase');
    
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching open games:', error);
      return [];
    }
    
    console.log('Fetched open games successfully:', data);
    return data as GameRecord[] || [];
  } catch (error) {
    console.error('Exception fetching open games:', error);
    return [];
  }
};

// Function to update a game when a user joins
export const joinGame = async (
  gameId: string, 
  joined_wallet: string
): Promise<boolean> => {
  try {
    console.log('Updating game status in Supabase:', { gameId, joined_wallet });
    
    const { error } = await supabase
      .from('games')
      .update({
        status: 'joined',
        joined_wallet
      })
      .eq('id', gameId);
    
    if (error) {
      console.error('Error updating game status:', error);
      return false;
    }
    
    console.log('Game status updated successfully');
    return true;
  } catch (error) {
    console.error('Exception updating game status:', error);
    return false;
  }
};

// Function to update game state
export const updateGameState = async (
  gameId: string,
  updates: Partial<GameRecord>
): Promise<boolean> => {
  try {
    console.log('Updating game state in Supabase:', { gameId, updates });
    
    // Create update object without last_update field
    const { last_update, ...updateData } = updates;
    
    const { error } = await supabase
      .from('games')
      .update({
        ...updateData,
        last_update: new Date().toISOString()
      })
      .eq('id', gameId);
    
    if (error) {
      console.error('Error updating game state:', error);
      return false;
    }
    
    console.log('Game state updated successfully');
    return true;
  } catch (error) {
    console.error('Exception updating game state:', error);
    return false;
  }
};

// Function to record a move
export const recordMove = async (
  gameId: string,
  playerWallet: string,
  move: string,
  isCreator: boolean
): Promise<boolean> => {
  try {
    const field = isCreator ? 'player1_move' : 'player2_move';
    console.log(`Recording ${field} in Supabase:`, { gameId, move });
    
    const { error } = await supabase
      .from('games')
      .update({
        [field]: move,
        last_update: new Date().toISOString()
      })
      .eq('id', gameId);
    
    if (error) {
      console.error('Error recording move:', error);
      return false;
    }
    
    console.log('Move recorded successfully');
    return true;
  } catch (error) {
    console.error('Exception recording move:', error);
    return false;
  }
};

// Function to update round result and increment round
export const updateRoundAndResult = async (
  gameId: string,
  result: string,
  nextRound: number
): Promise<boolean> => {
  try {
    console.log('Updating round result in Supabase:', { gameId, result, nextRound });
    
    const { error } = await supabase
      .from('games')
      .update({
        round_result: result,
        current_round: nextRound,
        player1_move: null,
        player2_move: null,
        last_update: new Date().toISOString()
      })
      .eq('id', gameId);
    
    if (error) {
      console.error('Error updating round result:', error);
      return false;
    }
    
    console.log('Round result updated successfully');
    return true;
  } catch (error) {
    console.error('Exception updating round result:', error);
    return false;
  }
};

// Subscribe to game changes (for real-time updates)
export const subscribeToGame = (
  gameId: string,
  callback: (payload: RealtimePostgresChangesPayload<GameRecord>) => void
) => {
  console.log(`Setting up realtime subscription for game: ${gameId}`);
  
  return supabase
    .channel(`game-${gameId}`)
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'games',
        filter: `id=eq.${gameId}`
      },
      (payload) => {
        console.log('Game update detected:', payload);
        callback(payload as RealtimePostgresChangesPayload<GameRecord>);
      }
    )
    .subscribe();
};

// Subscribe to all games (for lobby updates)
export const subscribeToGames = (
  callback: (payload: RealtimePostgresChangesPayload<GameRecord>) => void
) => {
  console.log('Setting up realtime subscription for all games');
  
  return supabase
    .channel('games-channel')
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'games'
      },
      (payload) => {
        console.log('Games update detected:', payload);
        callback(payload as RealtimePostgresChangesPayload<GameRecord>);
      }
    )
    .subscribe();
};
