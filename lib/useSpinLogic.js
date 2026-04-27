import { useEffect, useState } from 'react';

/**
 * useSpinLogic - Decoupled from Supabase
 * Use this to manage the current game state and historical data locally.
 */
export const useSpinLogic = () => {
  const [currentDraw, setCurrentDraw] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initializing the "Lucra" environment
    const initLocalData = () => {
      try {
        // You can leave these as null/empty; the SpinPage's 
        // demoMode logic will take over if currentDraw is null.
        setCurrentDraw(null);
        setHistory([]);
      } catch (error) {
        console.error("Error initializing spin data:", error);
      } finally {
        setLoading(false);
      }
    };

    initLocalData();

    // Logic for cleanup if needed in the future
    return () => {
      // No active subscriptions to close
    };
  }, []);

  /**
   * Helper to manually push new results into history from the UI
   */
  const addResultToHistory = (newResult) => {
    setHistory((prev) => {
      const updated = [newResult, ...prev];
      return updated.slice(0, 200);
    });
  };

  return { 
    currentDraw, 
    setCurrentDraw, // Exposed so SpinPage can update the "active" draw
    history, 
    setHistory, 
    addResultToHistory,
    loading 
  };
};
