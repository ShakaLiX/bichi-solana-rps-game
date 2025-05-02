
import Header from "@/components/Header";
import GameBoard from "@/components/GameBoard";
import { GameProvider } from "@/contexts/GameContext";

const GamePage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <GameProvider>
        <main className="flex-grow">
          <GameBoard />
        </main>
      </GameProvider>
    </div>
  );
};

export default GamePage;
