// src/pages/GamePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import GameBoard from '@/components/GameBoard';
import { fetchGameData, joinGameRecord } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useWallet } from '@solana/wallet-adapter-react';
import { GameProvider } from '@/contexts/GameContext';

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

  // Load game once
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

  // Join handler
  const handleJoin = async () => {
    if (!publicKey || !gameId) return;
    setJoining(true);
    const ok = await joinGameRecord(gameId, publicKey.toString());
    setJoining(false);
    if (ok) {
      const refreshed = await fetchGameData(gameId);
      setGame(refreshed);
    } else {
      alert('Failed to join. Try again.');
    }
  };

  if (loading) return <p className="p-8">Loading game…</p>;

  // If game is still open, show Join UI
  if (game!.status === 'open') {
    return (
      <div className="p-8">
        <Header />
        <Alert>
          <AlertTitle>Game #{game!.id}</AlertTitle>
          <AlertDescription>
            Created by <strong>{game!.creator_wallet}</strong><br/>
            Stake: {game!.stake_amount} SOL<br/>
            Waiting for another player…
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

  // Otherwise, both players are in—start the GameProvider/Board
  return (
    <GameProvider gameId={gameId!}>
      <GameBoard />
    </GameProvider>
  );
};

export default GamePage;
