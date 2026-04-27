import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export const useSpinLogic = () => {
  const [currentDraw, setCurrentDraw] = useState(null);
  const [history,     setHistory]     = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data: draw } = await supabase
          .from('spin_draws')
          .select('*')
          .order('id', { ascending: false })
          .limit(1)
          .single();

        const { data: hist } = await supabase
          .from('spin_history_200')
          .select('*')
          .order('id', { ascending: false })
          .limit(200);

        setCurrentDraw(draw);
        setHistory(hist || []);
      } catch (error) {
        console.error('Error fetching spin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    const drawSubscription = supabase
      .channel('draw-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spin_draws' }, (payload) => {
        setCurrentDraw(payload.new);
      })
      .subscribe();

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

  return { currentDraw, history, loading };
};
