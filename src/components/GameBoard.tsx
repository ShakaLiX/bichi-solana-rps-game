// src/components/GameBoard.tsx
import React from 'react';
import { useGame } from '@/contexts/GameContext';
import Timer from './Timer';
import GameMove from './GameMove';

const GameBoard = () => {
  const { state, selectMove, commitMove } = useGame();

  const { phase, playerMove, opponentMove, roundResult, playerScore, opponentScore, round, stake } = state;

  return (
    <div>
      <h2>Round {round} – {playerScore} : {opponentScore}</h2>
      {phase==='waitingToCommit' && (
        <>
          <Timer seconds={30} onComplete={()=>commitMove()} />
          <div className="moves">
            {(['rock','paper','scissors'] as const).map(m=>(
              <GameMove
                key={m}
                moveType={m}
                selected={playerMove===m}
                onClick={()=>selectMove(m)}
              />
            ))}
          </div>
          <button disabled={!playerMove} onClick={commitMove}>
            Confirm
          </button>
        </>
      )}
      {phase==='waitingToReveal' && <p>Waiting for opponent...</p>}
      {phase==='showResult' && (
        <div>
          <p>You played {playerMove}</p>
          <p>They played {opponentMove}</p>
          <p>
            {roundResult==='win'?'You win!':
             roundResult==='lose'?'You lose!':
             "It's a tie!"}
          </p>
        </div>
      )}
      {phase==='gameOver' && <p>Game Over! {state.winner===state.playerPubkey?'You Won!':'You Lost.'}</p>}
      <p>Stake: {stake} SOL</p>
    </div>
  );
};

export default GameBoard;
