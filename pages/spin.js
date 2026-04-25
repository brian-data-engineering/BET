import React, { useState, useEffect, useMemo } from 'react';
import { useSpinLogic } from '../lib/useSpinLogic';
import WheelEngine from '../components/spin/WheelEngine';
import StatsGrid from '../components/spin/StatsGrid';
import SectorsDisplay from '../components/spin/SectorsDisplay';

export default function SpinPage() {
  const { currentDraw, history, loading } = useSpinLogic();
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

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
      if (diff === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [currentDraw?.ends_at, currentDraw?.status]);

  useEffect(() => {
    if (currentDraw?.winning_number !== null && currentDraw?.status === 'closed') {
      setIsSpinning(true);
    }
  }, [currentDraw?.winning_number, currentDraw?.status]);

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="text-yellow-500 text-xl font-black animate-pulse tracking-widest">INITIALIZING LUCRA...</div>
    </div>
  );

  return (
    <div 
      className="min-h-screen p-4 font-sans text-white bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('https://i.ibb.co/fV6QLvwP/wood-texture-planks-vertical-patterns-dark-brown-design-background-vector.jpg')` }}
    >
      {/* HEADER SECTION */}
      <div className="max-w-[1600px] mx-auto bg-black/70 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/10 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-700 p-3 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.4)]">
             <span className="text-black font-black text-2xl italic tracking-tighter">LUCRA</span>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">Royal <span className="text-yellow-500">Spin</span></h1>
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase mt-1">Draw ID: #{currentDraw?.id || '---'}</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Time Remaining</span>
          <span className={`text-5xl font-mono font-black tabular-nums ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* MAIN DASHBOARD */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: SECTORS & RECENT */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-5 border border-white/5 shadow-xl">
            <SectorsDisplay history={history} />
          </div>
          
          <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-5 border border-white/5 shadow-xl">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Last 10 Results</h3>
            <div className="grid grid-cols-5 gap-3">
              {history.slice(0, 10).map((h, i) => (
                <div key={i} className={`aspect-square rounded-full flex items-center justify-center font-black text-sm border-2 shadow-lg transition-transform hover:scale-110 ${
                  h.color === 'red' ? 'bg-red-600 border-red-400' : 
                  h.color === 'black' ? 'bg-zinc-900 border-zinc-700' : 'bg-green-600 border-green-400'
                }`}>
                  {h.num}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: THE WHEEL ENGINE */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center py-4">
          <div className="relative group">
            {/* Ambient Glow behind the wheel */}
            <div className="absolute -inset-20 bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none"></div>
            
            <WheelEngine 
              winningNumber={currentDraw?.winning_number} 
              onSpinComplete={() => setIsSpinning(false)} 
            />
            
            {isSpinning && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                 <div className="bg-black/90 px-8 py-3 rounded-full border-2 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)]">
                    <span className="text-yellow-500 font-black tracking-widest text-lg animate-pulse">SPINNING...</span>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: 200 ROUNDS GRID */}
        <div className="lg:col-span-3">
          <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-5 border border-white/5 shadow-xl max-h-[80vh] overflow-y-auto custom-scrollbar">
             <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 text-center">200 Rounds Frequency</h3>
             <StatsGrid history={history} />
          </div>
        </div>

      </div>
    </div>
  );
}
