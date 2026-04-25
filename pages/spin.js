import React, { useState, useEffect } from 'react';
import { useSpinLogic } from '../lib/useSpinLogic';
import WheelEngine from '../components/spin/WheelEngine';
import StatsGrid from '../components/spin/StatsGrid';

// ── Replace these two URLs with your imgbb links ──────────────────────────────
const LOGO_ROYAL_SPIN = 'https://i.ibb.co/tfP23Bn/Royal-Spin.png'; // e.g. https://i.ibb.co/xxx/royal-spin.png
const LOGO_BRAND      = 'https://i.ibb.co/67wb7Zm1/download.png';   // e.g. https://i.ibb.co/yyy/mbogi.png
// ─────────────────────────────────────────────────────────────────────────────

export default function SpinPage() {
  const { currentDraw, history, loading } = useSpinLogic();
  const [timeLeft,   setTimeLeft]   = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!currentDraw?.ends_at || currentDraw?.status === 'closed') {
      setTimeLeft(0);
      return;
    }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(currentDraw.ends_at) - Date.now()) / 1000));
      setTimeLeft(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentDraw?.ends_at, currentDraw?.status]);

  // Trigger spin
  useEffect(() => {
    if (currentDraw?.winning_number !== null && currentDraw?.winning_number !== undefined && currentDraw?.status === 'closed') {
      setIsSpinning(true);
    }
  }, [currentDraw?.winning_number, currentDraw?.status]);

  const mm = String(Math.floor(timeLeft / 60)).padStart(1, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <span className="text-yellow-500 text-xl font-black animate-pulse tracking-widest">INITIALIZING LUCRA...</span>
    </div>
  );

  return (
    <div
      className="min-h-screen w-full flex overflow-hidden"
      style={{
        backgroundImage: `url('https://i.ibb.co/fV6QLvwP/wood-texture-planks-vertical-patterns-dark-brown-design-background-vector.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        fontFamily: "'Barlow Condensed', sans-serif",
      }}
    >

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
      <div className="w-[180px] shrink-0 flex flex-col items-center gap-6 py-8 px-4">

        {/* Royal Spin Logo — swap src with your imgbb link */}
        <div className="w-full flex justify-center">
          <img
            src={LOGO_ROYAL_SPIN}
            alt="Royal Spin"
            className="w-28 h-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          />
        </div>

        {/* Draw ID */}
        <div className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Draw ID</p>
          <p className="text-yellow-400 font-black text-xl tracking-tight">
            # {currentDraw?.id || '---'}
          </p>
        </div>

        {/* Bets Close In */}
        <div className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Bets Close In</p>
          <p className={`font-black text-2xl tabular-nums tracking-tight ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
            {mm}:{ss}
          </p>
        </div>

        {/* Brand Logo — swap src with your imgbb link */}
        <div className="mt-auto w-full flex justify-center">
          <img
            src={LOGO_BRAND}
            alt="Brand"
            className="w-24 h-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          />
        </div>
      </div>

      {/* ── CENTER: WHEEL ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center py-6">
        <div className="relative">
          {/* Ambient glow */}
          <div
            className="absolute -inset-16 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(212,160,12,0.08) 0%, transparent 70%)' }}
          />
          <WheelEngine
            winningNumber={currentDraw?.winning_number}
            onSpinComplete={() => setIsSpinning(false)}
          />
        </div>
      </div>

      {/* ── RIGHT SIDEBAR: STATS ─────────────────────────────────── */}
      <div className="w-[340px] shrink-0 flex flex-col py-4 pr-4 pl-2 overflow-y-auto">
        <div className="bg-black/75 border border-white/8 rounded-2xl p-4 backdrop-blur-sm flex-1 overflow-y-auto custom-scrollbar">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4 text-center">
            200 Rounds Frequency
          </h2>
          <StatsGrid history={history} />
        </div>
      </div>

    </div>
  );
}
