// src/components/CreateGameForm.tsx
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createGameRecord } from '@/lib/supabase';
import { createTransferTransaction, ESCROW_PUBKEY } from '@/lib/solana';
import { PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onCreated: (id: string) => void;
}

const CreateGameForm: React.FC<Props> = ({ onCreated }) => {
  const { publicKey, sendTransaction } = useWallet();
  const [stake, setStake] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!publicKey || stake <= 0) return;
    setLoading(true);
    try {
      // 1️⃣ Send SOL to escrow
      const tx = await createTransferTransaction(
        ESCROW_PUBKEY,
        new PublicKey(ESCROW_PUBKEY),
        stake
      );
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig);

      // 2️⃣ Record game in Supabase
      const record = await createGameRecord(publicKey.toString(), stake);
      if (record) onCreated(record.id);
      else alert('Failed to create game record');
    } catch (err) {
      console.error(err);
      alert('Error creating game—see console');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 flex items-center space-x-4">
      <Input
        type="number"
        min={0.001}
        step={0.001}
        value={stake}
        onChange={e => setStake(parseFloat(e.target.value))}
        placeholder="Stake (SOL)"
        className="w-32"
      />
      <Button onClick={handleCreate} disabled={!publicKey || loading}>
        {loading ? 'Creating…' : 'Create Game'}
      </Button>
    </div>
  );
};

export default CreateGameForm;
