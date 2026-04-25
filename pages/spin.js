import React, { useState, useEffect, useMemo } from 'react';
import { useSpinLogic } from '../lib/useSpinLogic';
import WheelEngine from '../components/spin/WheelEngine';
import StatsGrid from '../components/spin/StatsGrid';
import SectorsDisplay from '../components/spin/SectorsDisplay';

export default function SpinPage() {
  // Our rewritten hook now provides everything we need
  const { currentDraw, history, loading } = useSpinLogic();
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  // 1. Reactive Timer: Follows the 'ends_at' from Supabase
  useEffect(() => {
    if (!currentDraw?.ends_at || currentDraw?.status === 'closed') {
      setTimeLeft(0);
      return;
    }

    const timer = setInterval(() => {
      const end = new Date(currentDraw.ends_at).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      
      setTimeLeft(diff);

      // When the timer hits zero, we wait for the Database Cron to update the 'winning_number'
      if (diff === 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentDraw?.ends_at, currentDraw?.status]);

  // 2. Trigger Wheel: When winning_number appears, start animation
  useEffect(() => {
    if (currentDraw?.winning_number !== null && currentDraw?.status === 'closed') {
      setIsSpinning(true);
    }
  }, [currentDraw?.winning_number, currentDraw?.status]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-yellow-500">INITIALIZING LUCRA ENGINE...</div>;

  return (
    <div className="min-h-screen bg-[#0f1115] text-white p-4 font-sans">
      {/* Header with Live Timer */}
      <div className="flex justify-between items-center mb-6 bg-[#1a1d23] p-6 rounded-2xl border border-white/5">
        <div>
          <h1 className="text-2xl font-black text-white">LUCRA <span className="text-yellow-500">SPIN</span></h1>
          <p className="text-[10px] tracking-widest text-gray-500 uppercase font-bold">Draw ID: #{currentDraw?.id || '---'}</p>
        </div>
        
        <div className="text-center">
          <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Time Remaining</p>
          <p className={`text-4xl font-mono font-black ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Statistics Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <SectorsDisplay history={history} />
          <div className="bg-[#1a1d23] p-5 rounded-2xl border border-white/5">
            <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase">Last 10 results</h3>
            <div className="flex flex-wrap gap-2">
              {history.slice(0, 10).map((h, i) => (
                <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                  h.color === 'red' ? 'bg-red-600 border-red-400' : h.color === 'black' ? 'bg-zinc-900 border-zinc-700' : 'bg-green-600 border-green-400'
                }`}>
                  {h.num}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Wheel Arena */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center bg-black/40 rounded-[40px] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
          <WheelEngine 
            winningNumber={currentDraw?.winning_number} 
            onSpinComplete={() => setIsSpinning(false)} 
          />
          {isSpinning && (
            <div className="absolute bottom-10 bg-yellow-500 text-black px-6 py-2 rounded-full font-black animate-bounce">
              RESULT INBOUND...
            </div>
          )}
        </div>

        {/* Global Freq Grid */}
        <div className="lg:col-span-3 bg-[#1a1d23] p-5 rounded-2xl border border-white/5">
          <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase text-center">Frequency (200 Rounds)</h3>
          <StatsGrid history={history} />
        </div>
      </div>
    </div>
  );
}
