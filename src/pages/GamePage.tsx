
import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import GameBoard from "@/components/GameBoard";
import { GameProvider } from "@/contexts/GameContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useWallet } from "@solana/wallet-adapter-react";

const GamePage = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { connected } = useWallet();

  if (!gameId) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="container max-w-4xl py-8 flex-grow">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>No game ID provided. Please return to the lobby.</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="container max-w-4xl py-8 flex-grow">
          <Alert variant="destructive">
            <AlertTitle>Wallet Not Connected</AlertTitle>
            <AlertDescription>Please connect your wallet to play the game.</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

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
