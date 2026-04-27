import { useEffect, useState, useCallback } from 'react';

const ROUND_DURATION = 30000; // 30 seconds per round

export const useSpinLogic = () => {
  const [currentDraw, setCurrentDraw] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const startNewRound = useCallback(() => {
    const newId = Math.floor(Math.random() * 1000000);
    const endTime = Date.now() + ROUND_DURATION;

    setCurrentDraw({
      id: newId,
      status: 'open',
      winning_number: null,
      ends_at: new Date(endTime).toISOString(),
    });
  }, []);

  useEffect(() => {
    // 1. Initial Boot
    setLoading(false);
    startNewRound();

    // 2. The Heartbeat: Check every second if we need to close the round
    const timer = setInterval(() => {
      setCurrentDraw((prev) => {
        if (!prev) return prev;

        const now = Date.now();
        const end = new Date(prev.ends_at).getTime();

        // If time is up and the round is still open, Close it & Pick a number
        if (now >= end && prev.status === 'open') {
          const winNum = Math.floor(Math.random() * 37);
          
          // Update History immediately
          setHistory(h => [{ num: winNum }, ...h].slice(0, 200));

          return {
            ...prev,
            status: 'closed',
            winning_number: winNum
          };
        }
        
        // If the round has been closed for 5 seconds, start a new one
        if (prev.status === 'closed' && now > end + 5000) {
          const newId = prev.id + 1;
          const newEnd = Date.now() + ROUND_DURATION;
          return {
            id: newId,
            status: 'open',
            winning_number: null,
            ends_at: new Date(newEnd).toISOString(),
          };
        }

        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [startNewRound]);

  return { currentDraw, history, loading };
};
