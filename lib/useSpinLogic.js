import { useEffect, useState, useCallback, useRef } from 'react';

const ROUND_DURATION = 30000; // 30 seconds for betting
const SPIN_ANIMATION_BUFFER = 25000; // Time to wait for the wheel to spin and show result

export const useSpinLogic = () => {
  const [currentDraw, setCurrentDraw] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Use a ref to track if we are currently in the "Animation/Result" phase
  // to prevent the heartbeat from starting a new round too early.
  const isSettlingRef = useRef(false);

  const startNewRound = useCallback((lastId = null) => {
    const newId = lastId ? lastId + 1 : Math.floor(Math.random() * 1000000);
    const endTime = Date.now() + ROUND_DURATION;

    isSettlingRef.current = false;
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
    if (!currentDraw) startNewRound();

    // 2. The Heartbeat
    const timer = setInterval(() => {
      const now = Date.now();

      setCurrentDraw((prev) => {
        if (!prev) return prev;

        const end = new Date(prev.ends_at).getTime();

        // PHASE A: Round ends -> Pick Winner
        if (now >= end && prev.status === 'open') {
          const winNum = Math.floor(Math.random() * 37);
          
          // Update History
          setHistory(h => [{ num: winNum }, ...h].slice(0, 200));
          
          isSettlingRef.current = true;

          return {
            ...prev,
            status: 'closed',
            winning_number: winNum,
          };
        }

        // PHASE B: Waiting for Animation -> Start Next Round
        // We wait for (end time + buffer) before resetting to 'open'
        if (prev.status === 'closed' && now > end + SPIN_ANIMATION_BUFFER) {
          if (isSettlingRef.current) {
            const nextId = prev.id + 1;
            const nextEndTime = Date.now() + ROUND_DURATION;
            
            isSettlingRef.current = false;
            
            return {
              id: nextId,
              status: 'open',
              winning_number: null,
              ends_at: new Date(nextEndTime).toISOString(),
            };
          }
        }

        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentDraw, startNewRound]);

  return { currentDraw, history, loading };
};
