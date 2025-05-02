import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createGameRecord } from '@/lib/supabase';
import { createTransferTransaction, ESCROW_PUBKEY } from '@/lib/solana';
import { Transaction } from '@solana/web3.js';

interface Props { onCreated: (id: string) => void; }
const CreateGameForm: React.FC<Props> = ({ onCreated }) => {
  const { publicKey, sendTransaction } = useWallet();
  const [stake, setStake] = useState(0.1);

  const handle = async () => {
    if (!publicKey) return;
    const { data, error } = await createGameRecord(publicKey.toString(), stake);
    if (error || !data) return;
    const tx = new Transaction().add(
      createTransferTransaction(publicKey, ESCROW_PUBKEY, stake)
    );
    await sendTransaction(tx, undefined);
    onCreated(data.id);
  };

  return (
    <div>
      <input
        type="number"
        value={stake}
        onChange={e => setStake(+e.target.value)}
        className="border px-2 py-1"
      />
      <button
        onClick={handle}
        className="ml-2 bg-blue-500 text-white px-4 py-1 rounded"
      >
        Create Game
      </button>
    </div>
  );
};

export default CreateGameForm;