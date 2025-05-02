import React from 'react';
interface Props { games: any[]; onJoin: (id: string) => void; }
const GamesList: React.FC<Props> = ({ games, onJoin }) => (
  <ul className="mt-6 space-y-4">
    {games.filter(g => g.status === 'open').map(g => (
      <li
        key={g.id}
        className="flex justify-between items-center p-4 bg-gray-100 rounded"
      >
        <span>
          {g.creator_wallet} staked {g.stake_amount} SOL
        </span>
        <button
          onClick={() => onJoin(g.id)}
          className="bg-green-500 text-white px-3 py-1 rounded"
        >
          Join
        </button>
      </li>
    ))}
  </ul>
);
export default GamesList;