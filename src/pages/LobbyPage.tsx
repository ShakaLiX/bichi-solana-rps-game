import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import CreateGameForm from '@/components/CreateGameForm';
import GamesList from '@/components/GamesList';
import { fetchOpenGames, subscribeToGame } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

const LobbyPage: React.FC = () => {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const [games, setGames] = useState<any[]>([]);

 useEffect(() => {
-  const sub = subscribeToGame('all', payload => {
-    setGames(prev => prev.map(g => (g.id === payload.new.id ? payload.new : g)));
-  });
-  return () => sub.unsubscribe();
+  // Only fetch once (you don’t need real-time in lobby)
+  ;(async () => {
+    const open = await fetchOpenGames();
+    setGames(open);
+  })();
}, []);


  return (
    <div className="p-8">
      <h1>Bichi RPS Lobby</h1>
      <CreateGameForm onCreated={id => navigate(`/game/${id}`)} />
      <GamesList games={games} onJoin={id => navigate(`/game/${id}`)} />
    </div>
  );
};

export default LobbyPage;