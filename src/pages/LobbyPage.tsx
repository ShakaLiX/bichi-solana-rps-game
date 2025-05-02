
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import CreateGameForm from "@/components/CreateGameForm";
import GamesList from "@/components/GamesList";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";

const LobbyPage = () => {
  const { toast } = useToast();
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  
  // Check Supabase connection on load
  useEffect(() => {
    const checkSupabaseConnection = async () => {
      try {
        // Simple query to check if we can connect to Supabase
        const { data, error } = await supabase
          .from('games')
          .select('count()', { count: 'exact', head: true });
        
        if (error) {
          console.error('Supabase connection error:', error);
          toast({
            title: "Connection Error",
            description: "Could not connect to the game server. Some features may be unavailable.",
            variant: "destructive",
          });
          setIsSupabaseConnected(false);
        } else {
          console.log('Supabase connected successfully');
          setIsSupabaseConnected(true);
        }
      } catch (error) {
        console.error('Error checking Supabase connection:', error);
        setIsSupabaseConnected(false);
      }
    };
    
    checkSupabaseConnection();
  }, [toast]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="container max-w-4xl py-8 flex-grow">
        <div className="text-center mb-12">
          <img 
            src="/lovable-uploads/7ca7c629-e231-4762-8cd9-27664b7d3a98.png" 
            alt="Bichi Mascot" 
            className="mx-auto h-24 w-24 animate-bounce-light" 
          />
          <h1 className="text-3xl font-bold text-bichi-brown mt-4">Welcome to BICHI</h1>
          <p className="text-bichi-brown max-w-lg mx-auto mt-2">
            The cutest blockchain-based Rock-Paper-Scissors game. Connect your
            wallet, stake tokens, and play with the adorable BICHI mascot!
          </p>
          
          {!isSupabaseConnected && (
            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-md text-yellow-800">
              <h3 className="font-bold">Supabase Not Connected</h3>
              <p>This app requires Supabase to be properly configured. Please check your connection settings.</p>
            </div>
          )}
        </div>
        
        <CreateGameForm />
        <GamesList />
      </main>
    </div>
  );
};

export default LobbyPage;
