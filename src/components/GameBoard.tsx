
// src/components/GameBoard.tsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Timer from './Timer';
import GameMove, { MoveType } from './GameMove';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGame } from '@/contexts/GameContext';
import { shortenAddress } from '@/lib/solana';

const GameBoard: React.FC = () => {
  const { state, selectMove, commitMove } = useGame();
  const { toast } = useToast();
  const { connected } = useWallet();

  useEffect(() => {
    if (!connected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to play.',
        variant: 'destructive'
      });
    }
  }, [connected, toast]);

  const {
    round,
    playerScore,
    opponentScore,
    playerMove,
    opponentMove,
    playerCommitted,
    opponentCommitted,
    roundResult,
    stake,
    playerPubkey,
    opponentPubkey,
    phase,
    winner
  } = state;

  return (
    <div className="container max-w-4xl py-4">
      <div className="flex items-center justify-between mb-6">
        <Link to="/">
          <Button variant="outline">← Back to Lobby</Button>
        </Link>
        <h2 className="text-xl font-medium">Round {round}/3 · {playerScore} - {opponentScore}</h2>
        <span className="font-medium">Stake: {stake} SOL</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Player side */}
        <div className="bg-white rounded-2xl p-6 shadow flex flex-col items-center">
          <div className="mb-4 text-center">
            <div className="bg-pink-200 rounded-full px-3 py-1 mb-2 text-pink-700 font-medium">YOU</div>
            <p>{playerPubkey ? shortenAddress(playerPubkey) : '---'}</p>
          </div>
          {playerCommitted ? (
            <div className="text-center">
              {playerMove && <GameMove moveType={playerMove} />}
              <p className="mt-2">Locked In</p>
            </div>
          ) : (
            <p>Waiting for your move...</p>
          )}
        </div>

        {/* Center */}
        <div className="flex flex-col items-center">
          {phase !== 'gameOver' && <Timer seconds={30} />}
          <div className="text-3xl font-bold my-4">VS</div>

          {roundResult && (
            <div className="mb-4 text-center">
              {roundResult === 'win' && <p className="text-green-600 font-bold">🎉 You win!</p>}
              {roundResult === 'lose' && <p className="text-red-500 font-bold">😢 You lose!</p>}
              {roundResult === 'tie' && <p className="text-yellow-600 font-bold">🤝 It's a tie!</p>}
            </div>
          )}

          {phase === 'waitingToCommit' && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              {(['rock','paper','scissors'] as MoveType[]).map(move => (
                <GameMove
                  key={move}
                  moveType={move}
                  selected={playerMove === move}
                  onClick={() => selectMove(move)}
                  disabled={!connected}
                />
              ))}
            </div>
          )}

          {!playerCommitted && playerMove && phase === 'waitingToCommit' && (
            <Button onClick={commitMove}>Confirm</Button>
          )}

          {phase === 'gameOver' && (
            <div className="mt-4 text-center">
              {winner ? (
                winner === playerPubkey ? (
                  <p className="text-xl">🎉 You won the match!</p>
                ) : (
                  <p className="text-xl">Game Over</p>
                )
              ) : (
                <p className="text-xl">Match tied</p>
              )}
              <Link to="/" className="mt-4 inline-block">
                <Button>Return to Lobby</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Opponent side */}
        <div className="bg-white rounded-2xl p-6 shadow flex flex-col items-center">
          <div className="mb-4 text-center">
            <div className="bg-orange-200 rounded-full px-3 py-1 mb-2 text-orange-700 font-medium">OPP</div>
            <p>{opponentPubkey ? shortenAddress(opponentPubkey) : '---'}</p>
          </div>

          {opponentCommitted ? (
            <div className="text-center">
              {roundResult != null ? (
                opponentMove && <GameMove moveType={opponentMove} />
              ) : (
                <p>Locked In</p>
              )}
            </div>
          ) : (
            <p>Waiting for opponent...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
