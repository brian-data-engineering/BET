import React, { useMemo } from 'react';

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const SECTORS = {
  A: [1, 2, 3, 4, 5, 6],
  B: [7, 8, 9, 10, 11, 12],
  C: [13, 14, 15, 16, 17, 18],
  D: [19, 20, 21, 22, 23, 24],
  E: [25, 26, 27, 28, 29, 30],
  F: [31, 32, 33, 34, 35, 36, 0],
};

function numBg(n) {
  if (n === 0) return 'bg-[#166534]'; 
  return REDS.has(n) ? 'bg-[#8a1018]' : 'bg-[#111111]';
}

export default function StatsGrid({ history = [] }) {
  const counts = useMemo(() => {
    const c = {};
    for (let i = 0; i <= 36; i++) c[i] = 0;
    history.forEach(h => { 
      const num = typeof h === 'object' ? h.num : h;
      if (num !== undefined && c[num] !== undefined) c[num]++; 
    });
    return c;
  }, [history]);

  const maxCount = useMemo(() => Math.max(...Object.values(counts), 1), [counts]);

  const getFilteredCount = (condition) => history.filter(h => condition(typeof h === 'object' ? h.num : h)).length;

  const rows = Array.from({ length: 12 }, (_, i) => ({ a: i + 1, b: i + 13, c: i + 25 }));
  const redTotal = getFilteredCount(n => REDS.has(n));
  const blackTotal = getFilteredCount(n => n !== 0 && !REDS.has(n));

  // Style constants for extreme density
  const sectionHeader = "text-[9px] font-black uppercase tracking-[0.2em] text-yellow-500/40 mb-2 flex justify-between items-center border-b border-white/5 pb-1";
  const rowBox = "flex items-center justify-between bg-black/30 rounded-sm px-1.5 py-1 border border-white/5";

  return (
    <div className="h-full flex flex-col justify-between text-white select-none space-y-4">
      
      {/* ── 1. NUMBERS FREQUENCY (THE CORE) ── */}
      <section className="flex-none">
        <div className={sectionHeader}>
          <span>Statistics</span>
          <span className="text-[7px] text-gray-600">LAST 200</span>
        </div>
        <div className="grid grid-cols-3 gap-x-1 gap-y-[2px]">
          {rows.map(({ a, b, c }) => (
            [a, b, c].map(num => (
              <div key={num} className="flex items-center justify-between bg-white/[0.03] px-1 py-[1px] rounded-sm">
                <span className={`w-5 h-5 flex items-center justify-center rounded-sm text-[9px] font-black ${numBg(num)}`}>
                  {num}
                </span>
                <span className={`text-[10px] font-mono ${counts[num] >= maxCount * 0.8 ? 'text-yellow-400 font-bold' : 'text-gray-400'}`}>
                  {counts[num]}
                </span>
              </div>
            ))
          ))}
        </div>
        {/* Zero & Colors - Inline to save space */}
        <div className="grid grid-cols-3 gap-1 mt-1">
          <div className="flex items-center justify-between bg-white/[0.03] px-1 py-[1px] rounded-sm">
            <span className="w-5 h-5 flex items-center justify-center rounded-sm text-[9px] font-black bg-[#166534]">0</span>
            <span className="text-[10px] font-mono text-gray-400">{counts[0]}</span>
          </div>
          <div className="bg-red-900/20 border border-red-900/40 rounded-sm flex items-center justify-center text-[8px] font-black text-red-500">R: {redTotal}</div>
          <div className="bg-zinc-800/40 border border-white/5 rounded-sm flex items-center justify-center text-[8px] font-black text-gray-400">B: {blackTotal}</div>
        </div>
      </section>

      {/* ── 2. GROUPS (COMPACT GRID) ── */}
      <section className="flex-none">
        <div className={sectionHeader}><span>Markets</span></div>
        <div className="grid grid-cols-5 gap-1">
          {[
            ['1-12', getFilteredCount(n => n >= 1 && n <= 12)],
            ['13-24', getFilteredCount(n => n >= 13 && n <= 24)],
            ['25-36', getFilteredCount(n => n >= 25 && n <= 36)],
            ['ODD', getFilteredCount(n => n > 0 && n % 2 !== 0)],
            ['EVEN', getFilteredCount(n => n > 0 && n % 2 === 0)]
          ].map(([label, val]) => (
            <div key={label} className="flex flex-col items-center bg-black/40 rounded-sm py-1 border border-white/5">
              <span className="text-[7px] font-bold text-gray-500">{label}</span>
              <span className="text-[10px] font-mono font-black text-yellow-500/80">{val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. SECTORS (ULTRA COMPACT) ── */}
      <section className="flex-none">
        <div className={sectionHeader}><span>Sectors</span></div>
        <div className="grid grid-cols-6 gap-1">
          {Object.entries(SECTORS).map(([letter, nums]) => (
            <div key={letter} className="flex flex-col items-center bg-gradient-to-b from-zinc-800/50 to-black/50 border border-white/5 rounded-sm py-1">
              <span className="text-[10px] font-black text-yellow-500 leading-none mb-1">{letter}</span>
              <span className="text-[9px] font-mono text-white leading-none">{getFilteredCount(n => nums.includes(n))}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
