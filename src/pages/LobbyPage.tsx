
import Header from "@/components/Header";
import CreateGameForm from "@/components/CreateGameForm";
import GamesList from "@/components/GamesList";

const LobbyPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="container max-w-4xl py-8 flex-grow">
        <div className="text-center mb-12">
          <img 
            src="/lovable-uploads/7ca7c629-e231-4762-8cd9-27664b7d3a98.png" 
            alt="Bichi Mascot" 
            className="mx-auto h-24 w-24 animate-bounce-light" 
          />
          <h1 className="text-3xl font-bold text-bichi-brown mt-4">Welcome to BICHI</h1>
          <p className="text-bichi-brown max-w-lg mx-auto mt-2">
            The cutest blockchain-based Rock-Paper-Scissors game. Connect your
            wallet, stake tokens, and play with the adorable BICHI mascot!
          </p>
        </div>
        
        <CreateGameForm />
        <GamesList />
      </main>
    </div>
  );
};

export default LobbyPage;
