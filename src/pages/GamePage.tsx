import React from 'react';
import { useParams } from 'react-router-dom';
import GameBoard from '@/components/GameBoard';
import { GameProvider } from '@/contexts/GameContext';

const GamePage: React.FC = () => {
  const { gameId } = useParams();
  return (
    <GameProvider gameId={gameId!}>
      <GameBoard />
    </GameProvider>
  );
};

export default GamePage;