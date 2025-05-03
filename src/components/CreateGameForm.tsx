
// src/components/CreateGameForm.tsx
import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { createGameRecord } from '@/lib/supabase';
import { createTransferTransaction, ESCROW_PUBKEY } from '@/lib/solana';
import { PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onCreated: (id: string) => void;
}

const CreateGameForm: React.FC<Props> = ({ onCreated }) => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [stake, setStake] = useState<number>(0.1); // Default to 0.1 SOL to avoid NaN
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!publicKey || stake <= 0) {
      toast({
        title: "Invalid input",
        description: "Please connect your wallet and enter a valid stake amount",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      // 1️⃣ Send SOL to escrow
      const tx = await createTransferTransaction(
        publicKey,
        new PublicKey(ESCROW_PUBKEY),
        stake
      );
      
      console.log('Sending transaction:', {
        from: publicKey.toString(),
        to: ESCROW_PUBKEY,
        amount: stake
      });
      
      const sig = await sendTransaction(tx, connection);
      console.log('Transaction sent:', sig);
      await connection.confirmTransaction(sig);
      console.log('Transaction confirmed!');

      // 2️⃣ Record game in Supabase
      const result = await createGameRecord(publicKey.toString(), stake);
      console.log('createGameRecord →', result);
      
      if (result) {
        toast({
          title: "Game created!",
          description: `Game created with ${stake} SOL stake`
        });
        onCreated(result.id);
      } else {
        toast({
          title: "Error creating game",
          description: "Failed to create game record in database",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Game creation error:', err);
      toast({
        title: "Transaction failed",
        description: err instanceof Error ? err.message : "See console for details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setStake(isNaN(value) ? 0 : value);
  };

  return (
    <div className="mb-6 flex items-center space-x-4">
      <Input
        type="number"
        min={0.001}
        step={0.001}
        value={stake}
        onChange={handleStakeChange}
        placeholder="Stake (SOL)"
        className="w-32"
      />
      <Button onClick={handleCreate} disabled={!publicKey || loading || stake <= 0}>
        {loading ? 'Creating…' : 'Create Game'}
      </Button>
    </div>
  );
};

export default CreateGameForm;
