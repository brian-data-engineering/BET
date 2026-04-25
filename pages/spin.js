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

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-yellow-500 font-bold">LOADING LUCRA...</div>;

  return (
    <div 
      className="min-h-screen p-4 font-sans text-white bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url('https://i.ibb.co/fV6QLvwP/wood-texture-planks-vertical-patterns-dark-brown-design-background-vector.jpg')` }}
    >
      {/* 1. TOP HEADER SECTION */}
      <div className="max-w-[1400px] mx-auto bg-black/80 backdrop-blur-md rounded-3xl p-6 mb-6 border border-white/10 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-yellow-600 p-3 rounded-xl shadow-lg">
             <span className="text-black font-black text-xl italic">LUCRA</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Royal <span className="text-yellow-500">Spin</span></h1>
            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Draw ID: #{currentDraw?.id || '---'}</p>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Time Remaining</span>
          <span className={`text-4xl font-mono font-black ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Sector Stats & Last 10 */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-black/85 rounded-2xl p-5 border border-white/5 shadow-xl">
            <SectorsDisplay history={history} />
          </div>
          <div className="bg-black/85 rounded-2xl p-5 border border-white/5 shadow-xl flex-grow">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Last 10 Results</h3>
            <div className="flex flex-wrap gap-2">
              {history.slice(0, 10).map((h, i) => (
                <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 shadow-lg ${
                  h.color === 'red' ? 'bg-red-600 border-red-400' : 
                  h.color === 'black' ? 'bg-zinc-900 border-zinc-700' : 'bg-green-600 border-green-400'
                }`}>
                  {h.num}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER: The Wheel */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center py-10">
          <div className="relative group">
            <div className="absolute -inset-10 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/20 transition duration-1000"></div>
            <WheelEngine 
              winningNumber={currentDraw?.winning_number} 
              onSpinComplete={() => setIsSpinning(false)} 
            />
          </div>
        </div>

        {/* RIGHT: Detailed Stats Grid */}
        <div className="lg:col-span-3 bg-black/85 rounded-2xl p-5 border border-white/5 shadow-xl">
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">Frequency (200 Rounds)</h3>
           <StatsGrid history={history} />
        </div>

      </div>
    </div>
  );
}
