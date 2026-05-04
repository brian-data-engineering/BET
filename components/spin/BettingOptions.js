import React from 'react';

const SPECIAL_BETS = [
  { label: 'SERIES 5/8',   description: '5 chips · 6 numbers' },
  { label: 'ORPHELINS',    description: '5 chips · 8 numbers' },
  { label: 'SERIES 0/2/3', description: '9 chips · 17 numbers' },
  { label: 'ZERO GAME',    description: '4 chips · 7 numbers', gold: true },
];

const octStyle = {
  clipPath: 'polygon(10% 0%, 90% 0%, 100% 20%, 100% 80%, 90% 100%, 10% 100%, 0% 80%, 0% 20%)',
};

export default function BettingOptions({ onPlaceBet }) {
  return (
    <div className="w-full bg-black/40 p-4 rounded-xl border border-white/10 backdrop-blur-md">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[#f8b808] font-black italic text-[10px] uppercase tracking-[0.3em]">
          Special Bets
        </h3>
        <div className="flex gap-1.5 items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* Bet buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {SPECIAL_BETS.map((bet) => (
          <button
            key={bet.label}
            onClick={() => onPlaceBet?.(bet.label)}
            style={octStyle}
            className={`group relative py-3.5 px-2 border transition-all duration-200
              ${bet.gold
                ? 'bg-gradient-to-b from-[#f8b808]/20 to-black/80 border-[#f8b808]/40 hover:border-[#f8b808]/80'
                : 'bg-gradient-to-b from-white/5 to-black/70 border-white/20 hover:border-[#f8b808]/50 hover:bg-white/5'
              }`}
          >
            <span
              className={`block text-[10px] font-black tracking-tight transition-colors leading-tight
                ${bet.gold ? 'text-[#f8b808]' : 'text-white group-hover:text-[#f8b808]'}`}
            >
              {bet.label}
            </span>
            <span className="block text-[8px] text-white/40 mt-0.5 font-medium">
              {bet.description}
            </span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-[#f8b808] transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}
