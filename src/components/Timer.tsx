import React, { useState, useEffect } from 'react';

interface TimerProps {
  seconds: number;
  onComplete?: () => void;
}

const Timer: React.FC<TimerProps> = ({ seconds, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);

  // Reset when the seconds prop changes (new round)
  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  // Countdown logic
  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete?.();
      return;
    }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft, onComplete]);

  return (
    <div className="relative w-20 h-20">
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx="40" cy="40" r="36"
          fill="transparent"
          stroke="#e5e5e5"
          strokeWidth="8"
        />
        <circle
          cx="40" cy="40" r="36"
          fill="transparent"
          stroke={timeLeft < seconds * 0.3 ? '#ff5757' : '#f5a05c'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={36 * 2 * Math.PI}
          strokeDashoffset={36 * 2 * Math.PI * (1 - timeLeft / seconds)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
        {timeLeft}
      </div>
    </div>
  );
};

export default Timer;
