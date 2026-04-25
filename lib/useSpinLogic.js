import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export const useSpinLogic = () => {
  const [currentDraw, setCurrentDraw] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Load: Get the current active draw and the last 200 history items
    const fetchInitialData = async () => {
      try {
        // Get the very latest draw (whether open or just closed)
        const { data: draw } = await supabase
          .from('spin_draws')
          .select('*')
          .order('id', { ascending: false })
          .limit(1)
          .single();

        // Get the last 200 history records for the stats grid
        const { data: hist } = await supabase
          .from('spin_history_200')
          .select('*')
          .order('id', { ascending: false })
          .limit(200);

        setCurrentDraw(draw);
        setHistory(hist || []);
      } catch (error) {
        console.error("Error fetching spin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // 2. Realtime: Listen for Draw Updates (When status changes or winning_number appears)
    const drawSubscription = supabase
      .channel('draw-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spin_draws' }, (payload) => {
        // If it's a new draw (INSERT) or a result (UPDATE), update the state
        setCurrentDraw(payload.new);
      })
      .subscribe();

    // 3. Realtime: Listen for History (When a result is finalized and moved to 200-history)
    const historySubscription = supabase
      .channel('history-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spin_history_200' }, (payload) => {
        setHistory((prev) => {
          // Add the new result to the top and keep only the last 200
          const updated = [payload.new, ...prev];
          return updated.slice(0, 200);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(drawSubscription);
      supabase.removeChannel(historySubscription);
    };
  }, []);

  return { currentDraw, history, loading };
};
