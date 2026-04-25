import React, { useState, useEffect, useMemo } from 'react';
import { useSpinLogic } from '../lib/useSpinLogic';
import WheelEngine from '../components/spin/WheelEngine';
import StatsGrid from '../components/spin/StatsGrid';
import SectorsDisplay from '../components/spin/SectorsDisplay';

export default function SpinPage() {
  const { currentDraw, history } = useSpinLogic();
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastProcessedDraw, setLastProcessedDraw] = useState(null);

  // 1. Unified Timer Logic
  useEffect(() => {
    if (!currentDraw?.ends_at) return;

    const calculateTime = () => {
      const end = new Date(currentDraw.ends_at).getTime();
      const now = new Date().getTime();
      return Math.max(0, Math.floor((end - now) / 1000));
    };

    // Set initial time immediately
    setTimeLeft(calculateTime());

    const timer = setInterval(() => {
      const diff = calculateTime();
      setTimeLeft(diff);
      if (diff === 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentDraw?.ends_at]);

  // 2. Spin Trigger Logic
  // Only trigger if draw ID changes AND there is a winning number
  useEffect(() => {
    if (currentDraw?.winning_number !== null && currentDraw?.id !== lastProcessedDraw) {
      setIsSpinning(true);
      setLastProcessedDraw(currentDraw.id);
    }
  }, [currentDraw?.winning_number, currentDraw?.id, lastProcessedDraw]);

  const handleSpinComplete = () => {
    setIsSpinning(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Optimization: Only slice history when it actually changes
  const recentHistory = useMemo(() => history.slice(0, 10), [history]);

  return (
    <div className="min-h-screen bg-[#0f1115] text-white p-4 font-sans selection:bg-yellow-500/30">
      {/* Top Navigation / Dashboard Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-[#1a1d23] p-5 rounded-2xl border border-white/5 shadow-2xl">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="h-12 w-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.3)]">
            <span className="text-black font-black text-2xl">L</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white">LUCRA <span className="text-yellow-500">SPIN</span></h1>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Draw ID: {currentDraw?.id || 'CONNECTING...'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Status</p>
            <p className="text-sm font-bold uppercase text-yellow-500">{currentDraw?.status || 'Waiting'}</p>
          </div>
          <div className="h-12 w-[1px] bg-white/10 hidden md:block"></div>
          <div className="text-center min-w-[120px]">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Next Spin</p>
            <p className={`text-3xl font-mono font-black ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Statistics Column */}
        <div className="lg:col-span-3 space-y-6">
          <SectorsDisplay history={history} />
          
          <div className="bg-[#1a1d23] p-5 rounded-2xl border border-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Latest Results</h3>
            <div className="grid grid-cols-5 gap-3">
              {recentHistory.map((h, i) => (
                <div key={i} className={`aspect-square rounded-full flex items-center justify-center text-sm font-black shadow-lg border-2 ${
                  h.color === 'red' ? 'bg-red-600 border-red-400' : 
                  h.color === 'black' ? 'bg-zinc-900 border-zinc-700' : 
                  'bg-green-600 border-green-400'
                }`}>
                  {h.num}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Wheel Arena */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative bg-gradient-to-b from-[#1a1d23] to-[#0f1115] rounded-[40px] p-10 border border-white/5 shadow-inner">
          <div className="relative">
            <WheelEngine 
              winningNumber={currentDraw?.winning_number} 
              onSpinComplete={handleSpinComplete} 
            />
            
            {/* Center Overlay when results hit */}
            {!isSpinning && currentDraw?.winning_number !== null && (
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="bg-yellow-500 text-black text-4xl font-black h-20 w-20 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.5)] border-4 border-white animate-scale-in">
                    {currentDraw.winning_number}
                  </div>
               </div>
            )}
          </div>

          {isSpinning && (
            <div className="mt-8 flex items-center gap-3 bg-yellow-500/10 px-6 py-2 rounded-full border border-yellow-500/20">
              <div className="h-2 w-2 bg-yellow-500 rounded-full animate-ping"></div>
              <span className="text-yellow-500 font-black uppercase tracking-widest text-sm">Wheel Spinning</span>
            </div>
          )}
        </div>

        {/* Global Stats Grid */}
        <div className="lg:col-span-3">
          <div className="bg-[#1a1d23] p-5 rounded-2xl border border-white/5 h-full">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 text-center">200 Rounds Frequency</h3>
            <StatsGrid history={history} />
          </div>
        </div>
      </main>
    </div>
  );
}
