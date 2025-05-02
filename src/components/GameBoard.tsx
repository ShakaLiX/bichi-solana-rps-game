
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Timer from "./Timer";
import GameMove from "./GameMove";
import { useGameContext } from "@/contexts/GameContext";
import { shortenAddress } from "@/lib/solana";
import { useWallet } from "@solana/wallet-adapter-react";

const GameBoard = () => {
  const { toast } = useToast();
  const { connected } = useWallet();
  const { 
    gameState, 
    selectMove, 
    commitMove, 
    isLoading 
  } = useGameContext();
  
  // Check if wallet is connected
  useEffect(() => {
    if (!connected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to play the game.",
        variant: "destructive"
      });
    }
  }, [connected, toast]);
  
  const handleSelectMove = (move: "rock" | "paper" | "scissors" | null) => {
    if (gameState.playerCommitted || gameState.gameOver) return;
    selectMove(move);
  };
  
  const handleCommitMove = async () => {
    if (!gameState.playerMove || gameState.playerCommitted || gameState.gameOver) return;
    await commitMove();
  };

  const handleTimerComplete = () => {
    console.log("TIMEOUT: Timer completed in GameBoard");
    // Timer completion is now handled in the GameContext
  };
  
  return (
    <div className="container max-w-4xl py-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2 border-bichi-orange text-bichi-brown hover:bg-bichi-light-orange">
            ← Back to Lobby
          </Button>
        </Link>
        
        <div className="text-center">
          <h2 className="text-xl font-medium text-bichi-brown">
            Round {gameState.round}/3 · {gameState.playerScore} - {gameState.opponentScore}
          </h2>
        </div>
        
        <div className="text-right">
          <span className="text-bichi-brown font-medium">Stake: {gameState.stake} SOL</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {/* Player side */}
        <div className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center">
          <div className="text-center mb-4">
            <div className="inline-block bg-pink-200 rounded-full px-4 py-1 text-sm font-medium text-pink-700 mb-2">
              YOU
            </div>
            <p className="text-bichi-brown">
              {gameState.playerPubkey ? shortenAddress(gameState.playerPubkey) : 'Not Connected'}
            </p>
          </div>
          
          <div className="flex-grow flex items-center justify-center">
            {gameState.playerCommitted ? (
              <div className="text-center">
                <div className="text-5xl mb-2">
                  {gameState.playerMove && <GameMove moveType={gameState.playerMove} />}
                </div>
                <p className="mt-2 text-bichi-brown">Move locked in</p>
              </div>
            ) : gameState.playerMove ? (
              <div className="text-center">
                <div className="text-5xl mb-2">
                  <GameMove moveType={gameState.playerMove} />
                </div>
                <p className="mt-2 text-bichi-brown">Confirm your choice</p>
              </div>
            ) : (
              <div className="text-center text-bichi-brown">
                <p>Waiting for your move...</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Center - timer and moves */}
        <div className="flex flex-col items-center justify-between">
          <div className="flex flex-col items-center justify-center mt-4">
            {!gameState.gameOver && (
              <Timer 
                seconds={30} 
                onComplete={handleTimerComplete} 
              />
            )}
            
            <div className="text-3xl font-bold text-bichi-brown mt-4">VS</div>
            
            {gameState.roundResult && (
              <div className="my-4">
                {gameState.roundResult === "win" && (
                  <div className="text-center">
                    <div className="text-3xl mb-2">🎉</div>
                    <p className="font-bold text-green-600">You win!</p>
                  </div>
                )}
                {gameState.roundResult === "lose" && (
                  <div className="text-center">
                    <div className="text-3xl mb-2">😢</div>
                    <p className="font-bold text-red-500">You lose!</p>
                  </div>
                )}
                {gameState.roundResult === "tie" && (
                  <div className="text-center">
                    <div className="text-3xl mb-2">🤝</div>
                    <p className="font-bold text-yellow-600">It's a tie!</p>
                  </div>
                )}
              </div>
            )}
            
            {!gameState.roundResult && (
              <p className="text-center text-bichi-brown my-2">
                Choose your move to play!
              </p>
            )}
            
            {gameState.gameOver ? (
              <img 
                src="/lovable-uploads/7ca7c629-e231-4762-8cd9-27664b7d3a98.png"
                alt="Bichi Mascot"
                className="w-24 h-24 animate-bounce-light mt-4"
              />
            ) : (
              <img 
                src="/lovable-uploads/db5b6b02-e4e6-4acc-949b-06112f816110.png"
                alt="Bichi Playing"
                className="w-32 h-32 object-contain mt-4"
              />
            )}
          </div>
          
          {!gameState.playerCommitted && !gameState.gameOver && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <GameMove 
                moveType="rock" 
                selected={gameState.playerMove === "rock"}
                onClick={() => handleSelectMove("rock")}
                disabled={!connected}
              />
              <GameMove 
                moveType="paper" 
                selected={gameState.playerMove === "paper"}
                onClick={() => handleSelectMove("paper")}
                disabled={!connected}
              />
              <GameMove 
                moveType="scissors" 
                selected={gameState.playerMove === "scissors"}
                onClick={() => handleSelectMove("scissors")}
                disabled={!connected}
              />
            </div>
          )}
          
          {gameState.playerMove && !gameState.playerCommitted && !gameState.gameOver && (
            <Button 
              className="mt-4 bg-bichi-orange hover:bg-bichi-brown text-white"
              onClick={handleCommitMove}
              disabled={isLoading || !connected}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                  Confirming...
                </>
              ) : (
                "Confirm Choice"
              )}
            </Button>
          )}
          
          {gameState.gameOver && (
            <Link to="/" className="mt-4">
              <Button className="bg-bichi-orange hover:bg-bichi-brown text-white">
                Return to Lobby
              </Button>
            </Link>
          )}
        </div>
        
        {/* Opponent side */}
        <div className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center">
          <div className="text-center mb-4">
            <div className="inline-block bg-orange-200 rounded-full px-4 py-1 text-sm font-medium text-orange-700 mb-2">
              OPP
            </div>
            <p className="text-bichi-brown">
              {gameState.opponentPubkey ? shortenAddress(gameState.opponentPubkey) : 'Waiting...'}
            </p>
          </div>
          
          <div className="flex-grow flex items-center justify-center">
            {gameState.opponentCommitted ? (
              <div className="text-center">
                {gameState.roundResult === null ? (
                  <div className="text-bichi-brown">
                    <div className="bg-bichi-light-orange rounded-full p-3">
                      <span className="text-3xl">🔒</span>
                    </div>
                    <p className="mt-2">Move locked in</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-5xl mb-2">
                      {gameState.opponentMove && <GameMove moveType={gameState.opponentMove} />}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-bichi-brown">
                <p>Waiting for player...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
