
import Header from "@/components/Header";
import GameBoard from "@/components/GameBoard";

const GamePage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <GameBoard />
      </main>
    </div>
  );
};

export default GamePage;
