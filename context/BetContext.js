import { createContext, useContext, useState, useEffect } from 'react';

const BetContext = createContext();

export function BetProvider({ children }) {
  const [slipItems, setSlipItems] = useState([]);

  // Load from storage on startup
  useEffect(() => {
    const saved = localStorage.getItem('lucra_bets');
    if (saved) setSlipItems(JSON.parse(saved));
  }, []);

  // Save to storage whenever a bet is added/removed
  useEffect(() => {
    localStorage.setItem('lucra_bets', JSON.stringify(slipItems));
  }, [slipItems]);

  return (
    <BetContext.Provider value={{ slipItems, setSlipItems }}>
      {children}
    </BetContext.Provider>
  );
}

export const useBets = () => useContext(BetContext);
