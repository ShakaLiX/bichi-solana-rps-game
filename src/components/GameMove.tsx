
import { ReactNode } from "react";
import { rock, paper, scissors } from "../lib/gameIcons";

type MoveType = "rock" | "paper" | "scissors";

interface GameMoveProps {
  moveType: MoveType;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const moves: Record<MoveType, { icon: ReactNode; label: string }> = {
  rock: {
    icon: rock,
    label: "Rock",
  },
  paper: {
    icon: paper,
    label: "Paper",
  },
  scissors: {
    icon: scissors,
    label: "Scissors",
  },
};

const GameMove = ({ moveType, selected = false, onClick, disabled = false }: GameMoveProps) => {
  const { icon, label } = moves[moveType];
  
  return (
    <div 
      className={`move-button ${selected ? 'selected' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={!disabled ? onClick : undefined}
    >
      <div className="text-3xl">{icon}</div>
      <span className="text-sm font-medium text-bichi-brown">{label}</span>
    </div>
  );
};

export default GameMove;
