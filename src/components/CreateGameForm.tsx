import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { createTransferTransaction, ESCROW_PUBKEY, getBalance, shortenAddress } from '@/lib/solana';
import { createGameRecord } from '@/lib/supabase';
import { format } from 'date-fns';

const CreateGameForm = () => {
  const { toast } = useToast();
  const { publicKey, signTransaction, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [token] = useState("SOL");
  const [stakeAmount, setStakeAmount] = useState(0.1);
  const [isCreating, setIsCreating] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Fetch wallet balance when connected
  useEffect(() => {
    if (connected && publicKey) {
      console.log("CreateGameForm: Fetching balance for connected wallet");
      getBalance(publicKey)
        .then(balance => {
          console.log("CreateGameForm: Balance fetched:", balance);
          setWalletBalance(balance);
        })
        .catch(error => {
          console.error('CreateGameForm: Error fetching balance:', error);
          toast({
            title: "Balance Error",
            description: "Failed to fetch your wallet balance. Please try refreshing.",
            variant: "destructive"
          });
        });
    } else {
      setWalletBalance(0);
    }
  }, [connected, publicKey, toast]);

  // Update form when wallet balance changes
  useEffect(() => {
    console.log("CreateGameForm: Wallet balance updated to:", walletBalance);
    // If the current stake amount is higher than the wallet balance, adjust it
    if (stakeAmount > walletBalance && walletBalance > 0) {
      const newStake = Math.min(0.1, walletBalance - 0.01); // Leave 0.01 SOL for gas fees
      setStakeAmount(Math.max(newStake, 0.01));
    }
  }, [walletBalance, stakeAmount]);

  const handleIncrement = () => {
    setStakeAmount(prev => {
      const maxAmount = walletBalance > 0 ? walletBalance - 0.01 : 10;
      const newAmount = Math.min(prev + 0.1, maxAmount);
      console.log("Incrementing stake to:", newAmount);
      return newAmount;
    });
  };

  const handleDecrement = () => {
    setStakeAmount(prev => {
      const newAmount = Math.max(prev - 0.1, 0.1);
      console.log("Decrementing stake to:", newAmount);
      return newAmount;
    });
  };

  const handleCreateGame = async () => {
    if (!publicKey || !signTransaction || !sendTransaction) {
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

    console.log("Creating game with stake:", stakeAmount, "SOL");
    setIsCreating(true);

    try {
      // Create a transaction to transfer SOL to the escrow account
      console.log("Creating transaction for", stakeAmount, "SOL to", ESCROW_PUBKEY.toString());
      const transaction = await createTransferTransaction(
        publicKey,
        ESCROW_PUBKEY,
        stakeAmount
      );
      
      console.log("Transaction created. Sending to wallet for approval...");
      
      // Send the transaction directly using sendTransaction from useWallet
      const signature = await sendTransaction(transaction, connection);
      console.log("Transaction sent! Signature:", signature);
      
      // Confirm the transaction
      console.log("Confirming transaction...");
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      console.log("Transaction confirmation:", confirmation);
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
      }
      
      // Save the game to Supabase
      console.log("Saving game record to Supabase...");
      const gameRecord = await createGameRecord(
        publicKey.toBase58(),
        stakeAmount
      );
      
      if (!gameRecord) {
        throw new Error("Failed to save game to database");
      }
      
      console.log("Game record saved successfully:", gameRecord);
      
      toast({
        title: "Game Created!",
        description: `Your game with ${stakeAmount} SOL stake is now available for others to join.`,
      });
      
      // Refresh balance after creating game
      if (publicKey) {
        console.log("Refreshing balance after transaction");
        getBalance(publicKey)
          .then(balance => {
            console.log("New balance after transaction:", balance);
            setWalletBalance(balance);
          })
          .catch(error => console.error('Error fetching balance after game creation:', error));
      }
    } catch (error) {
      console.error('Transaction error:', error);
      
      // Provide more specific error messages based on error type
      let errorMessage = "Failed to create game. Please try again.";
      
      if (error.message?.includes("User rejected")) {
        errorMessage = "Transaction was cancelled by user.";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction. Please check your balance.";
      } else if (error.message?.includes("blockhash")) {
        errorMessage = "Transaction timed out. Please try again.";
      }
      
      toast({
        title: "Transaction Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
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
              disabled={!connected || stakeAmount <= 0.1}
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
              disabled={!connected || stakeAmount >= (walletBalance - 0.01)}
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
          disabled={isCreating || !connected || walletBalance < stakeAmount}
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
