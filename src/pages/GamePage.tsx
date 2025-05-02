// src/pages/GamePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import GameBoard from '@/components/GameBoard';
import { GameProvider } from '@/contexts/GameContext';
import { fetchGameData, joinGameRecord } from '@/lib/supabase';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface GameData {
  id: string;
  creator_wallet: string;
  joined_wallet: string | null;
  status: 'open' | 'joined' | 'completed';
  stake_amount: number;
  current_round: number;
}

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [game, setGame] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  // 1️⃣ Load game on mount
  useEffect(() => {
    if (!gameId) return;
    (async () => {
      const data = await fetchGameData(gameId);
      if (!data) {
        navigate('/');
        return;
      }
      setGame(data);
      setLoading(false);
    })();
  }, [gameId, navigate]);

  // 2️⃣ Handle join
  const handleJoin = async () => {
    if (!publicKey || !gameId) return;
    setJoining(true);
    const success = await joinGameRecord(gameId, publicKey.toString());
    setJoining(false);
    if (success) {
      // Refresh the page so that game.status === 'joined'
      const updated = await fetchGameData(gameId);
      setGame(updated);
    } else {
      alert('Failed to join. Try again.');
    }
  };

  if (loading) {
    return <p className="p-8">Loading game…</p>;
  }

  // 3️⃣ If still open, show Join button
  if (game!.status === 'open') {
    return (
      <div className="p-8">
        <Header />
        <Alert>
          <AlertTitle>Game #{game!.id}</AlertTitle>
          <AlertDescription>
            Created by <strong>{game!.creator_wallet}</strong><br/>
            Stake: {game!.stake_amount} SOL<br/>
            Waiting for someone to join…
          </AlertDescription>
        </Alert>
        <div className="mt-6">
          <Button onClick={handleJoin} disabled={joining || !publicKey}>
            {joining ? 'Joining…' : 'Join Game'}
          </Button>
        </div>
      </div>
    );
  }

  // 4️⃣ Otherwise start the game
  return (
    <GameProvider gameId={gameId!}>
      <GameBoard />
    </GameProvider>
  );
};

export default GamePage;
