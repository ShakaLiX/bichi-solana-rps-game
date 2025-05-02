import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { fetchOpenGames, GameRecord } from '@/lib/supabase';
import CreateGameForm from '@/components/CreateGameForm';
import GamesList from '@/components/GamesList';
import { useNavigate } from 'react-router-dom';

const LobbyPage: React.FC = () => {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const [games, setGames] = useState<GameRecord[]>([]);

  // Fetch open games once on mount
  useEffect(() => {
    (async () => {
      const open = await fetchOpenGames();
      setGames(open);
    })();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Bichi RPS Lobby</h1>
      <CreateGameForm onCreated={id => navigate(`/game/${id}`)} />
      <GamesList games={games} onJoin={id => navigate(`/game/${id}`)} />
    </div>
  );
};

export default LobbyPage;
