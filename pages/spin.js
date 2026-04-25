import React, { useState, useEffect, useCallback } from 'react';
import { useSpinLogic } from '../lib/useSpinLogic';
import WheelEngine from '../components/spin/WheelEngine';
import StatsGrid from '../components/spin/StatsGrid';

const LOGO_ROYAL_SPIN = 'https://i.ibb.co/tfP23Bn/Royal-Spin.png';
const LOGO_BRAND      = 'https://i.ibb.co/67wb7Zm1/download.png';

export default function SpinPage() {
  const { currentDraw, history, loading } = useSpinLogic();
  const [timeLeft, setTimeLeft] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const [localWinningNumber, setLocalWinningNumber] = useState(null);

  // 1. Precise Countdown Timer
  useEffect(() => {
    if (!currentDraw?.ends_at || currentDraw?.status === 'closed') {
      setTimeLeft(0);
      return;
    }
    const tick = () => {
      const now = Date.now();
      const end = new Date(currentDraw.ends_at).getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentDraw?.ends_at, currentDraw?.status]);

  // 2. Trigger Logic: Only spin when status is 'closed' and number is fresh
  useEffect(() => {
    const winNum = currentDraw?.winning_number;
    if (winNum !== null && winNum !== undefined && currentDraw?.status === 'closed') {
      setLocalWinningNumber(winNum);
      setShowWinner(false); // Reset overlay for new spin
    }
  }, [currentDraw?.winning_number, currentDraw?.status]);

  const handleSpinComplete = useCallback(() => {
    setShowWinner(true);
    // Optional: add a sound effect trigger here
  }, []);

  const mm = String(Math.floor(timeLeft / 60)).padStart(1, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <span className="text-yellow-500 text-xl font-black animate-pulse tracking-[0.3em]">INITIALIZING LUCRA...</span>
    </div>
  );

  return (
    <div
      className="min-h-screen w-full flex overflow-hidden select-none"
      style={{
        backgroundImage: `url('https://i.ibb.co/fV6QLvwP/wood-texture-planks-vertical-patterns-dark-brown-design-background-vector.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        fontFamily: "'Barlow Condensed', sans-serif",
      }}
    >
      {/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
      <div className="w-[180px] shrink-0 flex flex-col items-center gap-6 py-8 px-4 bg-black/20 backdrop-blur-md border-r border-white/5">
        <div className="w-full flex justify-center mb-4">
          <img src={LOGO_ROYAL_SPIN} alt="Royal Spin" className="w-28 h-auto drop-shadow-2xl" />
        </div>

        <div className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-center">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Draw ID</p>
          <p className="text-yellow-400 font-black text-xl italic"># {currentDraw?.id || '---'}</p>
        </div>

        <div className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-center">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Bets Close In</p>
          <p className={`font-black text-3xl tabular-nums ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
            {mm}:{ss}
          </p>
        </div>

        <div className="mt-auto w-full flex justify-center opacity-70 hover:opacity-100 transition-opacity">
          <img src={LOGO_BRAND} alt="Brand" className="w-20 h-auto" />
        </div>
      </div>

      {/* ── CENTER: THE WHEEL ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        
        {/* Winner Announcement Overlay */}
        {showWinner && (
          <div className="absolute top-20 z-50 animate-bounce">
            <div className="bg-yellow-500 text-black px-8 py-2 rounded-full font-black text-4xl shadow-[0_0_30px_#fbbf24]">
              WINNER: {localWinningNumber}
            </div>
          </div>
        )}

        <div className="relative">
          <div
            className="absolute -inset-24 rounded-full pointer-events-none opacity-50"
            style={{ background: 'radial-gradient(circle, rgba(212,160,12,0.15) 0%, transparent 70%)' }}
          />
          <WheelEngine
            winningNumber={localWinningNumber}
            onSpinComplete={handleSpinComplete}
          />
        </div>
      </div>

      {/* ── RIGHT SIDEBAR: STATS ─────────────────────────────────── */}
      <div className="w-[360px] shrink-0 flex flex-col py-6 pr-6 pl-2">
        <div className="bg-black/80 border border-white/10 rounded-3xl p-5 backdrop-blur-xl flex-1 shadow-2xl overflow-hidden flex flex-col">
          <h2 className="text-[11px] font-black text-yellow-500/50 uppercase tracking-[0.3em] mb-6 text-center border-b border-white/5 pb-4">
            Last 200 Rounds Frequency
          </h2>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <StatsGrid history={history} />
          </div>
        </div>
      </div>
    </div>
  );
}
