"use client";

import { useState, useEffect, useCallback } from "react";

// Helper to avoid quotation marks in labels
const formatLabel = (type, value) => {
  return `${type.toUpperCase()} ${value}`.replace(/['"]+/g, '');
};

export function useCashierBetLogic() {
  const [bets, setBets] = useState([]);
  const [countdown, setCountdown] = useState(120);
  const [results, setResults] = useState([]);
  const [isAcceptingBets, setIsAcceptingBets] = useState(true);

  // --- API LOGIC (MOCKABLE) ---
  useEffect(() => {
    const fetchGameStatus = async () => {
      try {
        const [timerRes, resultsRes] = await Promise.all([
          fetch('https://www.pushbet.shop/api/timer'),
          fetch('https://www.pushbet.shop/api/results')
        ]);
        
        const timerData = await timerRes.json();
        const resData = await resultsRes.json();

        setCountdown(timerData.seconds_remaining);
        setIsAcceptingBets(timerData.is_accepting_bets);
        
        if (resData.results) {
          // Normalize results into simple numbers
          const normalized = resData.results.map(r => r.num ?? r);
          setResults(normalized);
        }
      } catch (error) {
        console.error("Lucra API Error:", error);
      }
    };

    const interval = setInterval(fetchGameStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- BETTING ACTIONS ---
  const placeBet = useCallback((type, value, amount) => {
    if (!isAcceptingBets) return;
    
    setBets(prev => [...prev, {
      type,
      value,
      amount,
      label: formatLabel(type, value)
    }]);
  }, [isAcceptingBets]);

  const undoLastBet = useCallback(() => {
    setBets(prev => prev.slice(0, -1));
  }, []);

  const clearAllBets = useCallback(() => {
    setBets([]);
  }, []);

  const calculateTotals = () => {
    const totalStake = bets.reduce((sum, b) => sum + b.amount, 0);
    // Simple multiplier logic for now
    const potentialWin = bets.reduce((sum, b) => sum + (b.amount * 36), 0); 
    return { totalStake, potentialWin };
  };

  return {
    bets,
    countdown,
    results,
    isAcceptingBets,
    placeBet,
    undoLastBet,
    clearAllBets,
    totals: calculateTotals()
  };
}
