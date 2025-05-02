
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Timer from "./Timer";
import GameMove from "./GameMove";

type MoveType = "rock" | "paper" | "scissors" | null;

const GameBoard = () => {
  const { toast } = useToast();
  const [round, setRound] = useState(1);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [selectedMove, setSelectedMove] = useState<MoveType>(null);
  const [playerCommitted, setPlayerCommitted] = useState(false);
  const [opponentCommitted, setOpponentCommitted] = useState(false);
  const [roundResult, setRoundResult] = useState<"win" | "lose" | "tie" | null>(null);
  const [opponentMove, setOpponentMove] = useState<MoveType>(null);
  const [gameOver, setGameOver] = useState(false);
  
  // Simulate opponent committing after a random delay
  useEffect(() => {
    if (playerCommitted && !opponentCommitted) {
      const delay = Math.random() * 5000 + 1000; // 1-6 seconds
      const timer = setTimeout(() => {
        setOpponentCommitted(true);
        // Reveal moves and determine result after both committed
        setTimeout(revealMoves, 1000);
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [playerCommitted, opponentCommitted]);
  
  const handleSelectMove = (move: MoveType) => {
    if (playerCommitted || gameOver) return;
    setSelectedMove(move);
  };
  
  const handleCommitMove = () => {
    if (!selectedMove || playerCommitted || gameOver) return;
    
    setPlayerCommitted(true);
    toast({
      title: "Move Committed",
      description: "Waiting for your opponent to make a move...",
    });
  };
  
  const revealMoves = () => {
    // Generate random opponent move
    const moves: MoveType[] = ["rock", "paper", "scissors"];
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    setOpponentMove(randomMove);
    
    // Determine round result
    if (selectedMove === randomMove) {
      setRoundResult("tie");
      toast({ title: "It's a tie!", description: "No points awarded." });
    } else if (
      (selectedMove === "rock" && randomMove === "scissors") ||
      (selectedMove === "paper" && randomMove === "rock") ||
      (selectedMove === "scissors" && randomMove === "paper")
    ) {
      setRoundResult("win");
      setPlayerScore(prev => prev + 1);
      toast({ title: "You won this round!", description: `${selectedMove} beats ${randomMove}` });
    } else {
      setRoundResult("lose");
      setOpponentScore(prev => prev + 1);
      toast({ title: "You lost this round!", description: `${randomMove} beats ${selectedMove}` });
    }
    
    // Check for game over
    if (playerScore + 1 === 2) {
      // Player wins the match
      setTimeout(() => {
        setGameOver(true);
        toast({
          title: "🎉 You won the match!",
          description: "Your reward has been transferred to your wallet.",
          duration: 5000,
        });
      }, 1500);
    } else if (opponentScore + 1 === 2) {
      // Opponent wins the match
      setTimeout(() => {
        setGameOver(true);
        toast({
          title: "Game Over",
          description: "You lost the match. Better luck next time!",
          duration: 5000,
        });
      }, 1500);
    } else {
      // Continue to next round
      setTimeout(() => {
        setRound(prev => prev + 1);
        setSelectedMove(null);
        setOpponentMove(null);
        setPlayerCommitted(false);
        setOpponentCommitted(false);
        setRoundResult(null);
      }, 3000);
    }
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
            Round {round}/3 · {playerScore} - {opponentScore}
          </h2>
        </div>
        
        <div className="text-right">
          <span className="text-bichi-brown font-medium">Stake: 0.2 SOL</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {/* Player side */}
        <div className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center">
          <div className="text-center mb-4">
            <div className="inline-block bg-pink-200 rounded-full px-4 py-1 text-sm font-medium text-pink-700 mb-2">
              YOU
            </div>
            <p className="text-bichi-brown">Bz7n...3k4j</p>
          </div>
          
          <div className="flex-grow flex items-center justify-center">
            {playerCommitted ? (
              <div className="text-center">
                {roundResult === null ? (
                  <div className="text-bichi-brown">
                    <div className="bg-bichi-light-orange rounded-full p-3">
                      <span className="text-3xl">🔒</span>
                    </div>
                    <p className="mt-2">Move locked in</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-5xl mb-2">{selectedMove === "rock" ? "👊" : selectedMove === "paper" ? "✋" : "✌️"}</div>
                    <p className="text-bichi-brown capitalize">{selectedMove}</p>
                  </div>
                )}
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
            {!gameOver && !roundResult && (
              <Timer seconds={30} onComplete={playerCommitted ? undefined : () => handleSelectMove("rock")} />
            )}
            
            <div className="text-3xl font-bold text-bichi-brown mt-4">VS</div>
            
            {roundResult && (
              <div className="my-4">
                {roundResult === "win" && (
                  <div className="text-center">
                    <div className="text-3xl mb-2">🎉</div>
                    <p className="font-bold text-green-600">You win!</p>
                  </div>
                )}
                {roundResult === "lose" && (
                  <div className="text-center">
                    <div className="text-3xl mb-2">😢</div>
                    <p className="font-bold text-red-500">You lose!</p>
                  </div>
                )}
                {roundResult === "tie" && (
                  <div className="text-center">
                    <div className="text-3xl mb-2">🤝</div>
                    <p className="font-bold text-yellow-600">It's a tie!</p>
                  </div>
                )}
              </div>
            )}
            
            {!roundResult && (
              <p className="text-center text-bichi-brown my-2">
                Choose your move to play!
              </p>
            )}
            
            {gameOver ? (
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
          
          {!playerCommitted && !gameOver && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <GameMove 
                moveType="rock" 
                selected={selectedMove === "rock"}
                onClick={() => handleSelectMove("rock")}
              />
              <GameMove 
                moveType="paper" 
                selected={selectedMove === "paper"}
                onClick={() => handleSelectMove("paper")}
              />
              <GameMove 
                moveType="scissors" 
                selected={selectedMove === "scissors"}
                onClick={() => handleSelectMove("scissors")}
              />
            </div>
          )}
          
          {selectedMove && !playerCommitted && !gameOver && (
            <Button 
              className="mt-4 bg-bichi-orange hover:bg-bichi-brown text-white"
              onClick={handleCommitMove}
            >
              Confirm Choice
            </Button>
          )}
          
          {gameOver && (
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
            <p className="text-bichi-brown">3j5n...9k2m</p>
          </div>
          
          <div className="flex-grow flex items-center justify-center">
            {opponentCommitted ? (
              <div className="text-center">
                {roundResult === null ? (
                  <div className="text-bichi-brown">
                    <div className="bg-bichi-light-orange rounded-full p-3">
                      <span className="text-3xl">🔒</span>
                    </div>
                    <p className="mt-2">Move locked in</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-5xl mb-2">{opponentMove === "rock" ? "👊" : opponentMove === "paper" ? "✋" : "✌️"}</div>
                    <p className="text-bichi-brown capitalize">{opponentMove}</p>
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
