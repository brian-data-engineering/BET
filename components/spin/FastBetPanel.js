import React from 'react';

const hexStyle = {
  clipPath: 'polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)',
};

export default function FastBetPanel({ onBetPlaced }) {
  const handleBet = (type, value) => {
    onBetPlaced?.({ type, value });
  };

  return (
    <div className="w-full flex flex-col gap-4 p-4 bg-black/30 rounded-2xl border border-white/10 backdrop-blur-sm">
      
      {/* Twins & Mirror Row */}
      <div className="flex gap-6 items-start">
        {/* Twins */}
        <div>
          <p className="text-[9px] text-[#f8b808] font-black italic mb-1.5 uppercase tracking-widest">Twins</p>
          <button
            onClick={() => handleBet('twins', [11, 22, 33])}
            className="bg-black/60 border border-white/70 hover:border-[#f8b808]/70 
              hover:bg-white/5 px-4 py-2 text-white font-black tracking-[0.15em] text-sm
              transition-all duration-150"
          >
            11 | 22 | 33
          </button>
        </div>

        {/* Mirror */}
        <div>
          <p className="text-[9px] text-[#f8b808] font-black italic mb-1.5 uppercase tracking-widest">Mirror</p>
          <div className="flex gap-1.5">
            {['12 | 21', '13 | 31', '23 | 32'].map((m) => (
              <button
                key={m}
                onClick={() => handleBet('mirror', m)}
                className="bg-black/60 border border-white/70 hover:border-[#f8b808]/70 
                  hover:bg-white/5 px-2.5 py-2 text-white font-black text-xs
                  transition-all duration-150 whitespace-nowrap"
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Finals Row */}
      <div>
        <p className="text-[9px] text-[#f8b808] font-black italic mb-1.5 uppercase tracking-widest">Finals</p>
        <div className="grid grid-cols-10 gap-1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((f) => (
            <button
              key={f}
              onClick={() => handleBet('final', f)}
              className="aspect-square bg-[#003d2b]/60 border border-white/50 
                hover:bg-[#f8b808]/20 hover:border-[#f8b808]/60
                flex items-center justify-center text-white font-black text-base
                transition-all duration-150"
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Low/High Color Section */}
      <div className="flex items-center justify-between mt-1">
        {/* Red buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            style={hexStyle}
            onClick={() => handleBet('highColor', 'red-high')}
            className="bg-[#c0392b] w-24 py-2.5 text-white font-black text-[10px] 
              uppercase tracking-wider hover:brightness-125 transition-all active:scale-95"
          >
            HIGH
          </button>
          <button
            style={hexStyle}
            onClick={() => handleBet('lowColor', 'red-low')}
            className="bg-[#c0392b] w-24 py-2.5 text-white font-black text-[10px] 
              uppercase tracking-wider hover:brightness-125 transition-all active:scale-95"
          >
            LOW
          </button>
        </div>

        <div className="text-center">
          <p className="text-[#f8b808] font-black text-[11px] uppercase leading-snug tracking-wider">
            Low/High<br />Color
          </p>
        </div>

        {/* Black buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            style={hexStyle}
            onClick={() => handleBet('highColor', 'black-high')}
            className="bg-[#111] border border-white/25 w-24 py-2.5 text-white font-black text-[10px] 
              uppercase tracking-wider hover:bg-zinc-700 transition-all active:scale-95"
          >
            HIGH
          </button>
          <button
            style={hexStyle}
            onClick={() => handleBet('lowColor', 'black-low')}
            className="bg-[#111] border border-white/25 w-24 py-2.5 text-white font-black text-[10px] 
              uppercase tracking-wider hover:bg-zinc-700 transition-all active:scale-95"
          >
            LOW
          </button>
        </div>
      </div>
    </div>
  );
}
