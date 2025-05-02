
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if credentials are available before creating client
let supabase: ReturnType<typeof createClient>;

if (supabaseUrl && supabaseAnonKey) {
  // Only create client if both URL and key are available
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('Supabase client initialized successfully');
} else {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  // Create a mock client that logs errors instead of crashing
  supabase = {
    from: () => ({
      insert: () => {
        console.error('Supabase not configured: Cannot insert data');
        return { data: null, error: new Error('Supabase not configured') };
      },
      select: () => {
        console.error('Supabase not configured: Cannot select data');
        return { data: null, error: new Error('Supabase not configured') };
      },
      update: () => {
        console.error('Supabase not configured: Cannot update data');
        return { data: null, error: new Error('Supabase not configured') };
      },
      eq: () => ({
        order: () => {
          console.error('Supabase not configured: Cannot query data');
          return { data: [], error: new Error('Supabase not configured') };
        }
      }),
      single: () => {
        console.error('Supabase not configured: Cannot fetch single record');
        return { data: null, error: new Error('Supabase not configured') };
      }
    }),
    channel: () => ({
      on: () => ({
        subscribe: () => ({
          unsubscribe: () => console.log('Mock unsubscribe called')
        })
      })
    })
  } as any; // Type assertion to avoid TypeScript errors
}

export { supabase };

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
    return data;
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
    return data || [];
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
