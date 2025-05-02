
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from '@solana/wallet-adapter-react';
import { createTransferTransaction, ESCROW_PUBKEY, getBalance } from '@/lib/solana';

const CreateGameForm = () => {
  const { toast } = useToast();
  const { publicKey, signTransaction, connected } = useWallet();
  const [token] = useState("SOL");
  const [stakeAmount, setStakeAmount] = useState(0.1);
  const [isCreating, setIsCreating] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Fetch wallet balance when connected
  useEffect(() => {
    if (connected && publicKey) {
      getBalance(publicKey)
        .then(balance => setWalletBalance(balance))
        .catch(error => console.error('Error fetching balance:', error));
    } else {
      setWalletBalance(0);
    }
  }, [connected, publicKey]);

  const handleIncrement = () => {
    setStakeAmount(prev => Math.min(prev + 0.1, walletBalance > 0 ? walletBalance - 0.01 : 10));
  };

  const handleDecrement = () => {
    setStakeAmount(prev => Math.max(prev - 0.1, 0.1));
  };

  const handleCreateGame = async () => {
    if (!publicKey || !signTransaction) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to create a game.",
        variant: "destructive"
      });
      return;
    }

    if (walletBalance < stakeAmount) {
      toast({
        title: "Insufficient Balance",
        description: `You need at least ${stakeAmount} SOL to create this game.`,
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // Create a transaction to transfer SOL to the escrow account
      const transaction = await createTransferTransaction(
        publicKey,
        ESCROW_PUBKEY,
        stakeAmount
      );

      // Sign the transaction
      const signedTransaction = await signTransaction(transaction);

      // In a real implementation, we would send the transaction here
      // For now, we'll simulate this with a timeout
      setTimeout(() => {
        toast({
          title: "Game Created!",
          description: `Your game with ${stakeAmount} SOL stake is now available for others to join.`,
        });
        setIsCreating(false);
      }, 1000);

      // In a real implementation, we would broadcast the transaction:
      // const connection = getConnection();
      // const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      // await connection.confirmTransaction(signature);

    } catch (error) {
      console.error('Transaction error:', error);
      toast({
        title: "Transaction Failed",
        description: "Failed to create game. Please try again.",
        variant: "destructive"
      });
      setIsCreating(false);
    }
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
              disabled={!connected}
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
              disabled={!connected}
            >
              +
            </button>
          </div>
          <p className="text-right text-sm text-muted-foreground mt-1">
            Balance: {walletBalance.toFixed(2)} SOL
          </p>
        </div>
        
        <Button 
          className="w-full bg-gradient-to-r from-bichi-orange to-bichi-light-orange hover:opacity-90 text-white py-6 flex items-center justify-center gap-2"
          disabled={isCreating || !connected}
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
              {connected ? "Create Game" : "Connect Wallet to Create"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreateGameForm;
