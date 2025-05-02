
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CreateGameForm = () => {
  const { toast } = useToast();
  const [token] = useState("SOL");
  const [stakeAmount, setStakeAmount] = useState(0.1);
  const [isCreating, setIsCreating] = useState(false);

  const handleIncrement = () => {
    setStakeAmount(prev => Math.min(prev + 0.1, 10));
  };

  const handleDecrement = () => {
    setStakeAmount(prev => Math.max(prev - 0.1, 0.1));
  };

  const handleCreateGame = () => {
    setIsCreating(true);
    // Simulate transaction delay
    setTimeout(() => {
      toast({
        title: "Game Created!",
        description: `Your game with ${stakeAmount} SOL stake is now available for others to join.`,
      });
      setIsCreating(false);
    }, 1000);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-bichi-light-orange animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <img 
          src="/lovable-uploads/7ca7c629-e231-4762-8cd9-27664b7d3a98.png" 
          alt="Bichi Logo" 
          className="h-8 w-8 object-contain" 
        />
        <h2 className="text-xl font-semibold text-bichi-brown">Create New Game</h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1 text-bichi-brown">Select Token</label>
          <div className="relative">
            <select 
              className="w-full p-3 rounded-lg border border-bichi-light-orange bg-muted appearance-none cursor-not-allowed"
              disabled
              value={token}
            >
              <option value="SOL">SOL</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-bichi-brown" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm mb-1 text-bichi-brown">Stake Amount</label>
          <div className="flex items-center">
            <button 
              onClick={handleDecrement}
              className="h-12 w-12 rounded-l-lg bg-muted hover:bg-bichi-light-orange flex items-center justify-center text-lg font-bold border border-bichi-light-orange"
            >
              −
            </button>
            <input 
              type="text"
              className="h-12 w-full border-y border-bichi-light-orange text-center text-lg font-medium"
              value={`${stakeAmount.toFixed(1)} SOL`}
              readOnly
            />
            <button 
              onClick={handleIncrement}
              className="h-12 w-12 rounded-r-lg bg-muted hover:bg-bichi-light-orange flex items-center justify-center text-lg font-bold border border-bichi-light-orange"
            >
              +
            </button>
          </div>
          <p className="text-right text-sm text-muted-foreground mt-1">Balance: 5.24 SOL</p>
        </div>
        
        <Button 
          className="w-full bg-gradient-to-r from-bichi-orange to-bichi-light-orange hover:opacity-90 text-white py-6 flex items-center justify-center gap-2"
          disabled={isCreating}
          onClick={handleCreateGame}
        >
          {isCreating ? (
            <>
              <span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
              Creating...
            </>
          ) : (
            <>
              <img 
                src="/lovable-uploads/7ca7c629-e231-4762-8cd9-27664b7d3a98.png" 
                alt="Bichi Logo" 
                className="h-5 w-5 object-contain" 
              />
              Create Game
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreateGameForm;
