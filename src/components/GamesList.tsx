// src/components/GamesList.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { GameRecord } from '@/lib/supabase';
import { shortenAddress } from '@/lib/solana';
import { useWallet } from '@solana/wallet-adapter-react';

interface Props {
  games: GameRecord[];
  onJoin: (id: string) => void;
}

const GamesList: React.FC<Props> = ({ games, onJoin }) => {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toString();

  if (games.length === 0) {
    return <p className="text-center text-gray-500">No open games—create one!</p>;
  }

  return (
    <div className="space-y-4">
      {games.map(game => (
        <div
          key={game.id}
          className="p-4 border rounded-lg flex justify-between items-center"
        >
          <div>
            <p>
              <strong>Creator:</strong>{' '}
              {shortenAddress(game.creator_wallet)}
            </p>
            <p>
              <strong>Stake:</strong> {game.stake_amount} SOL
            </p>
          </div>
          <Button
            onClick={() => onJoin(game.id)}
            disabled={game.creator_wallet === wallet}
          >
            {game.creator_wallet === wallet ? 'Your Game' : 'Join'}
          </Button>
        </div>
      ))}
    </div>
  );
};

export default GamesList;
