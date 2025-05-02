
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import CreateGameForm from "@/components/CreateGameForm";
import GamesList from "@/components/GamesList";
import { useToast } from "@/hooks/use-toast";
import supabase, { subscribeToGames, RealtimePostgresChangesPayload, GameRecord } from "@/lib/supabase";
import { useWallet } from "@solana/wallet-adapter-react";

const LobbyPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  
  // Set up real-time subscription for game status changes
  useEffect(() => {
    if (!publicKey) return;
    
    const walletAddress = publicKey.toString();
    console.log('Setting up game subscription for wallet:', walletAddress);
    
    const subscription = subscribeToGames((payload: RealtimePostgresChangesPayload<GameRecord>) => {
      // If a game changed to 'joined' status and current user is either creator or joiner
      if (payload.eventType === 'UPDATE' && 
          payload.new.status === 'joined' && 
          (payload.new.creator_wallet === walletAddress || 
           payload.new.joined_wallet === walletAddress)) {
        
        console.log('Game joined, navigating to game page:', payload.new.id);
        toast({
          title: "Game Started!",
          description: "Another player has joined your game. Starting now...",
        });
        
        // Navigate to the game with the game ID
        navigate(`/game/${payload.new.id}`);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [publicKey, navigate, toast]);
  
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
        </div>
        
        <CreateGameForm />
        <GamesList />
      </main>
    </div>
  );
};

export default LobbyPage;
