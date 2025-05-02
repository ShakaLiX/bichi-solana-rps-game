import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { createTransferTransaction, ESCROW_PUBKEY, shortenAddress } from '@/lib/solana';
import { fetchOpenGames, subscribeToGames, joinGame, GameRecord, type RealtimePostgresChangesPayload } from '@/lib/supabase';
import { format } from 'date-fns';

// Convert Supabase GameRecord to our UI GameData format
const recordToGameData = (record: GameRecord): GameData => {
  return {
    id: record.id,
    creator: shortenAddress(record.creator_wallet),
    creatorPubkey: record.creator_wallet,
    stake: record.stake_amount,
    timestamp: format(new Date(record.created_at), 'hh:mm a')
  };
};

interface GameData {
  id: string;
  creator: string;
  creatorPubkey: string;
  stake: number;
  timestamp: string;
}

type FilterType = "ALL" | "SOL" | "USDC" | "RAY";

const GamesList = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [games, setGames] = useState<GameData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { publicKey, signTransaction, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  
  // Fetch games from Supabase and set up real-time subscription
  useEffect(() => {
    const loadGames = async () => {
      setIsLoading(true);
      try {
        // Fetch initial games
        const openGames = await fetchOpenGames();
        console.log('Initial open games loaded:', openGames);
        setGames(openGames.map(recordToGameData));
      } catch (error) {
        console.error('Error loading initial games:', error);
        toast({
          title: "Error Loading Games",
          description: "Failed to load available games. Please refresh the page.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Initial load
    loadGames();
    
    // Set up real-time subscription for updates
    const subscription = subscribeToGames((payload: RealtimePostgresChangesPayload<GameRecord>) => {
      console.log('Real-time game update received:', payload);
      
      if (payload.eventType === 'INSERT' && payload.new.status === 'open') {
        // New game was created
        setGames(prevGames => [recordToGameData(payload.new), ...prevGames]);
      } 
      else if (payload.eventType === 'UPDATE' && payload.new.status === 'joined') {
        // Game was joined, remove it from the list
        setGames(prevGames => prevGames.filter(game => game.id !== payload.new.id));
      }
    });

    // Cleanup subscription on component unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const handleJoinGame = async (id: string, stake: number) => {
    if (!publicKey || !signTransaction || !connected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to join a game.",
        variant: "destructive"
      });
      return;
    }
    
    setJoiningId(id);
    
    try {
      // Create a transaction to transfer SOL to the escrow account
      const transaction = await createTransferTransaction(
        publicKey,
        ESCROW_PUBKEY,
        stake
      );

      // Sign and send the transaction
      const signature = await sendTransaction(transaction, connection);
      console.log('Stake transaction sent:', signature);
      
      // Update the game status in Supabase
      const success = await joinGame(id, publicKey.toString());
      
      if (!success) {
        throw new Error("Failed to update game status in database");
      }
      
      toast({
        title: "Joined Game!",
        description: `You've joined a game with ${stake} SOL stake. Starting now...`,
      });
      
      // Navigate to game page after joining
      navigate(`/game/${id}`);
      
    } catch (error) {
      console.error('Transaction or database error:', error);
      toast({
        title: "Failed to Join Game",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setJoiningId(null);
    }
  };

  // Filter games based on selected filter
  const filteredGames = filter === "ALL" ? games : games.filter(game => filter === "SOL");

  return (
    <div className="mt-8 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <img 
            src="/lovable-uploads/7ca7c629-e231-4762-8cd9-27664b7d3a98.png" 
            alt="Bichi Logo" 
            className="h-8 w-8 object-contain" 
          />
          <h2 className="text-xl font-semibold text-bichi-brown">Available Games</h2>
        </div>
        
        <div className="flex gap-2">
          {(["ALL", "SOL", "USDC", "RAY"] as FilterType[]).map((type) => (
            <Button
              key={type}
              variant={filter === type ? "default" : "outline"}
              className={`rounded-full px-4 py-1 text-sm ${
                filter === type 
                  ? "bg-bichi-orange text-white" 
                  : "border-bichi-light-orange text-bichi-brown hover:bg-bichi-light-orange hover:text-bichi-brown"
              }`}
              onClick={() => setFilter(type)}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 text-center py-8">
            <div className="animate-spin inline-block h-8 w-8 border-4 border-bichi-orange border-t-transparent rounded-full mb-2"></div>
            <p className="text-muted-foreground">Loading games...</p>
          </div>
        ) : filteredGames.length > 0 ? (
          filteredGames.map((game) => (
            <div key={game.id} className="game-card">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-bichi-light-orange flex items-center justify-center text-bichi-brown font-medium">
                    {game.creator.charAt(0)}
                  </div>
                  <span className="text-bichi-brown font-medium">{game.creator}</span>
                </div>
                <span className="text-sm text-muted-foreground">{game.timestamp}</span>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div>
                  <span className="text-sm text-muted-foreground">Stake:</span>
                  <span className="ml-2 font-bold text-bichi-brown">{game.stake} SOL</span>
                </div>
                
                <Button 
                  className="bg-bichi-orange hover:bg-bichi-brown text-white"
                  disabled={joiningId === game.id || !connected}
                  onClick={() => handleJoinGame(game.id, game.stake)}
                >
                  {joiningId === game.id ? (
                    <>
                      <span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                      Joining...
                    </>
                  ) : (
                    connected ? "Join" : "Connect Wallet"
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-center mt-6">
                <img 
                  src="/lovable-uploads/7ca7c629-e231-4762-8cd9-27664b7d3a98.png" 
                  alt="Bichi Logo" 
                  className="h-12 w-12 object-contain opacity-20" 
                />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-8">
            <p className="text-muted-foreground">No games available. Create a new game to start playing!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamesList;
