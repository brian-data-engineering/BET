import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';

// Must match DB: cron inserts new draw at ends_at + 35s
export const SPIN_ANIM_MS = 20_000;   // 20s spin animation
export const RESULT_HOLD_MS = 15_000; // 15s show result  (total = 35s = DB settle window)

export const useSpinLogic = () => {
  const [currentDraw, setCurrentDraw] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const initGame = useCallback(async () => {
    const [{ data: draw }, { data: hist }] = await Promise.all([
      supabase
        .from('spin_draws')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('spin_history_200')
        .select('*')
        .order('id', { ascending: false })
        .limit(50),
    ]);

    if (draw) setCurrentDraw(draw);
    if (hist) setHistory(hist);
    setLoading(false);
  }, []);

  useEffect(() => {
    initGame();

    // Realtime: any change to spin_draws → update currentDraw
    const channel = supabase
      .channel('spin-draws-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spin_draws' },
        ({ new: newDraw }) => {
          setCurrentDraw(newDraw);
        }
      )
      // Realtime: new history entry → prepend to history list
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'spin_history_200' },
        ({ new: newEntry }) => {
          setHistory((prev) => [newEntry, ...prev].slice(0, 200));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initGame]);

  return { currentDraw, history, loading };
};
