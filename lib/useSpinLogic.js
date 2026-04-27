import { useEffect, useState, useCallback } from 'react';

export const useSpinLogic = () => {
  const [currentDraw, setCurrentDraw] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize the environment
  useEffect(() => {
    const initLocalData = () => {
      // Simulate a quick boot-up for the "Lucra" system
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    };

    initLocalData();
  }, []);

  /**
   * Manually trigger a new draw state. 
   * This allows the SpinPage to tell the hook: "Start a new round now."
   */
  const updateDraw = useCallback((drawData) => {
    setCurrentDraw(drawData);
  }, []);

  /**
   * Pushes a completed result into the history array.
   * Keeps exactly 200 items as per your Lucra specs.
   */
  const recordResult = useCallback((winningNumber) => {
    setHistory((prev) => {
      const newEntry = { 
        num: winningNumber, 
        timestamp: new Date().toISOString() 
      };
      const updated = [newEntry, ...prev];
      return updated.slice(0, 200);
    });
  }, []);

  return { 
    currentDraw, 
    history, 
    loading, 
    updateDraw, 
    recordResult 
  };
};
