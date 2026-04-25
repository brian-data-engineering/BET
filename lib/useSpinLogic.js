import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient'; // Adjust path to your client

export const useSpinLogic = () => {
  const [currentDraw, setCurrentDraw] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // 1. Fetch initial state
    const fetchInitialData = async () => {
      const { data: draw } = await supabase.from('spin_draws').select('*').order('id', { ascending: false }).limit(1).single();
      const { data: hist } = await supabase.from('spin_history_200').select('*').order('created_at', { ascending: false });
      setCurrentDraw(draw);
      setHistory(hist);
    };

    fetchInitialData();

    // 2. Listen for Draw updates (The result/winning number)
    const drawSubscription = supabase
      .channel('draw-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'spin_draws' }, (payload) => {
        setCurrentDraw(payload.new);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spin_draws' }, (payload) => {
        setCurrentDraw(payload.new);
      })
      .subscribe();

    // 3. Listen for History updates (The 200 rounds stats)
    const historySubscription = supabase
      .channel('history-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spin_history_200' }, (payload) => {
        setHistory((prev) => [payload.new, ...prev].slice(0, 200));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(drawSubscription);
      supabase.removeChannel(historySubscription);
    };
  }, []);

  return { currentDraw, history };
};
