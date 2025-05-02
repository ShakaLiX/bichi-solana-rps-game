
import { useState, useEffect } from "react";

interface TimerProps {
  seconds: number;
  onComplete?: () => void;
}

const Timer = ({ seconds, onComplete }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  
  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete?.();
      return;
    }
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timeLeft, onComplete]);
  
  return (
    <div className="relative flex items-center justify-center">
      <svg className="transform -rotate-90 w-20 h-20">
        <circle 
          cx="40" 
          cy="40" 
          r="36"
          fill="transparent"
          stroke="#E5E5E5"
          strokeWidth="8"
        />
        <circle 
          cx="40" 
          cy="40" 
          r="36"
          fill="transparent"
          stroke={timeLeft < 10 ? "#FF5757" : "#F5A05C"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={36 * 2 * Math.PI}
          strokeDashoffset={36 * 2 * Math.PI * (1 - timeLeft / seconds)}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <span className="absolute text-2xl font-bold text-bichi-brown">
        {timeLeft}
      </span>
    </div>
  );
};

export default Timer;
