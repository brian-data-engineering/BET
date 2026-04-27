import { useEffect, useState, useCallback } from 'react';

// To ensure the wheel stops perfectly:
// We need to keep the status 'closed' for exactly the duration of the animation + result display.
const BETTING_DURATION = 30000; // 30s betting time
const SPIN_ANIM_DURATION = 20000; // Matches ReferenceWheel.jsx duration
const RESULT_DISPLAY_TIME = 5000; // Show the number for 5s before reset
const TOTAL_SETTLE_TIME = SPIN_ANIM_DURATION + RESULT_DISPLAY_TIME;

export const useSpinLogic = () => {
  const [currentDraw, setCurrentDraw] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const startNewRound = useCallback((lastId = null) => {
    const newId = lastId ? lastId + 1 : Math.floor(Math.random() * 1000000);
    const endTime = Date.now() + BETTING_DURATION;

    setCurrentDraw({
      id: newId,
      status: 'open',
      winning_number: null,
      ends_at: new Date(endTime).toISOString(),
    });
  }, []);

  useEffect(() => {
    setLoading(false);
    // Boot the first round
    if (!currentDraw) startNewRound();

    const timer = setInterval(() => {
      const now = Date.now();

      setCurrentDraw((prev) => {
        if (!prev) return prev;
        const endTime = new Date(prev.ends_at).getTime();

        // 1. TRIGGER THE SPIN: When time is up, pick the winner and CLOSE the betting
        if (now >= endTime && prev.status === 'open') {
          const winNum = Math.floor(Math.random() * 37);
          
          // Add to history immediately so UI can update lists
          setHistory(h => [{ num: winNum }, ...h].slice(0, 200));

          return {
            ...prev,
            status: 'closed',
            winning_number: winNum,
          };
        }

        // 2. WAIT FOR ANIMATION: Don't change ANYTHING until the wheel stops
        // This ensures ReferenceWheel finishes its 20s animation and shows the result for 5s
        if (prev.status === 'closed' && now > endTime + TOTAL_SETTLE_TIME) {
          // Now it is safe to reset
          const nextId = prev.id + 1;
          const nextEndTime = Date.now() + BETTING_DURATION;
          
          return {
            id: nextId,
            status: 'open',
            winning_number: null,
            ends_at: new Date(nextEndTime).toISOString(),
          };
        }

        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentDraw, startNewRound]);

  return { currentDraw, history, loading };
};
