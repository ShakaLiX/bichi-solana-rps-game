
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from '@solana/wallet-adapter-react';
import { createTransferTransaction, ESCROW_PUBKEY, shortenAddress } from '@/lib/solana';

// This would come from our blockchain in a real implementation
interface GameData {
  id: string;
  creator: string;
  creatorPubkey: string;
  stake: number;
  timestamp: string;
}

// Mock data for available games - in a real app, this would be fetched from blockchain
const MOCK_GAMES: GameData[] = [
  { id: "1", creator: "3j5n...9k2m", creatorPubkey: "3j5n9k2mDzP8C6VEjkpQZ7wBrNa1X9HbKoJg7K8T", stake: 0.1, timestamp: "01:25 PM" },
  { id: "2", creator: "8z7n...3k4j", creatorPubkey: "8z7n3k4jL5Wx2YqF6bRnMzJpT9aS4DvEoG1H2K3m", stake: 0.5, timestamp: "01:41 PM" },
  { id: "3", creator: "2k8m...7j3n", creatorPubkey: "2k8m7j3nQsFgD9Hr1TbAyZvP5wX6C4LjKoN8E2Rp", stake: 0.2, timestamp: "01:50 PM" },
];

type FilterType = "ALL" | "SOL" | "USDC" | "RAY";

const GamesList = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [games, setGames] = useState<GameData[]>(MOCK_GAMES);
  const { publicKey, signTransaction, connected } = useWallet();

  // In a real implementation, we would fetch games from the blockchain
  useEffect(() => {
    // Simulating a blockchain query with a timeout
    const fetchGames = async () => {
      // Here we would query the blockchain for active games
      // For now, we'll use our mock data
      setGames(MOCK_GAMES);
    };

    fetchGames();
    
    // Set up polling to refresh games (simulating real-time updates)
    const interval = setInterval(fetchGames, 30000);
    
    return () => clearInterval(interval);
  }, []);

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

      // Sign the transaction
      const signedTransaction = await signTransaction(transaction);
      
      // In a real implementation, we would send the transaction here
      // For now, we'll simulate this with a timeout
      setTimeout(() => {
        toast({
          title: "Joined Game!",
          description: `You've joined a game with ${stake} SOL stake. Starting now...`,
        });
        
        // Navigate to game page after joining
        setTimeout(() => {
          navigate("/game");
        }, 1000);
        
        setJoiningId(null);
      }, 1500);
      
      // In a real implementation, we would broadcast the transaction:
      // const connection = getConnection();
      // const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      // await connection.confirmTransaction(signature);
      
    } catch (error) {
      console.error('Transaction error:', error);
      toast({
        title: "Transaction Failed",
        description: "Failed to join game. Please try again.",
        variant: "destructive"
      });
      setJoiningId(null);
    }
  };

  // Filter games based on selected filter (in a real app, this would be done at query time)
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
        {filteredGames.length > 0 ? (
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
