
// Use the Supabase client that Lovable has already configured
import { supabase } from '@/integrations/supabase/client';
export default supabase;

// Types for our games table
export interface GameRecord {
  id: string;
  creator_wallet: string;
  stake_amount: number;
  status: 'open' | 'joined' | 'completed';
  created_at: string;
  joined_wallet?: string;
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

// Subscribe to game changes (for real-time updates)
export const subscribeToGames = (
  callback: (payload: { new: GameRecord, eventType: string }) => void
) => {
  return supabase
    .channel('games_channel')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'games' },
      (payload) => {
        console.log('Game change detected:', payload);
        callback({
          new: payload.new as GameRecord,
          eventType: payload.eventType
        });
      }
    )
    .subscribe();
};
