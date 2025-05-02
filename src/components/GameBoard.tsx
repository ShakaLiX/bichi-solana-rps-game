import React from 'react';
import { useGame } from '@/contexts/GameContext';
import Timer from './Timer';
import GameMove from './GameMove';

const GameBoard: React.FC = () => {
  const { state, selectMove, commitMove } = useGame();
  const { phase, playerMove, opponentMove, round, playerScore, opponentScore, stake, roundResult } = state;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Round {round} • {playerScore}–{opponentScore}</h2>

      {phase === 'waitingToCommit' && (
        <>
          <Timer seconds={30} onComplete={commitMove} />
          <div className="flex gap-4 mt-4">
            {(['rock','paper','scissors'] as const).map(m => (
              <GameMove
                key={m}
                moveType={m}
                selected={playerMove===m}
                onClick={() => selectMove(m)}
              />
            ))}
          </div>
          <button
            onClick={commitMove}
            disabled={!playerMove}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Confirm
          </button>
        </>
      )}

      {phase === 'waitingToReveal' && (
        <p className="mt-6 text-center">Waiting for opponent...</p>
      )}

      {phase === 'showResult' && (
        <div className="mt-6 text-center">
          <p>You: {playerMove}</p>
          <p>Them: {opponentMove}</p>
          <p className="mt-2 font-semibold">
            {roundResult === 'win' ? 'You win this round!' :
             roundResult === 'lose' ? 'You lose this round.' :
             "It's a tie!"}
          </p>
        </div>
      )}

      {phase === 'gameOver' && (
        <div className="mt-6 text-center">
          <p className="text-2xl font-bold">
            {playerScore>opponentScore ? '🎉 You Won!' : '😢 You Lost.'}
          </p>
        </div>
      )}

      <p className="mt-8 text-sm">Stake: {stake} SOL</p>
    </div>
  );
};

export default GameBoard;