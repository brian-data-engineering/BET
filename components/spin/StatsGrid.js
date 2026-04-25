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
  if (n === 0) return 'bg-[#166534]'; // Deep Casino Green
  return REDS.has(n) ? 'bg-[#8a1018]' : 'bg-[#111111]'; // Deep Red or Zinc Black
}

export default function StatsGrid({ history = [] }) {
  // 1. Memoized Calculations
  const counts = useMemo(() => {
    const c = {};
    for (let i = 0; i <= 36; i++) c[i] = 0;
    history.forEach(h => { 
      // Handle different history formats (object vs raw number)
      const num = typeof h === 'object' ? h.num : h;
      if (num !== undefined && c[num] !== undefined) c[num]++; 
    });
    return c;
  }, [history]);

  const maxCount = useMemo(() => Math.max(...Object.values(counts), 1), [counts]);

  // 2. Data Mappings for the UI
  const rows = Array.from({ length: 12 }, (_, i) => ({
    a: i + 1,
    b: i + 13,
    c: i + 25,
  }));

  const redTotal = history.filter(h => REDS.has(typeof h === 'object' ? h.num : h)).length;
  const blackTotal = history.filter(h => {
    const n = typeof h === 'object' ? h.num : h;
    return n !== 0 && !REDS.has(n);
  }).length;

  const getFilteredCount = (condition) => history.filter(h => condition(typeof h === 'object' ? h.num : h)).length;

  const groups = [
    { label: 'LN1', val: getFilteredCount(n => n >= 1 && n <= 12) },
    { label: 'LN2', val: getFilteredCount(n => n >= 13 && n <= 24) },
    { label: 'LN3', val: getFilteredCount(n => n >= 25 && n <= 36) },
    { label: '1-12', val: getFilteredCount(n => n >= 1 && n <= 12) },
    { label: '13-24', val: getFilteredCount(n => n >= 13 && n <= 24) },
    { label: '25-36', val: getFilteredCount(n => n >= 25 && n <= 36) },
    { label: '1-18', val: getFilteredCount(n => n >= 1 && n <= 18) },
    { label: '19-36', val: getFilteredCount(n => n >= 19 && n <= 36) },
    { label: 'ODD', val: getFilteredCount(n => n > 0 && n % 2 !== 0) },
    { label: 'EVEN', val: getFilteredCount(n => n > 0 && n % 2 === 0) },
  ];

  // UI Helper Constants
  const sectionLabel = "text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500/80 mb-3 block text-center border-b border-white/5 pb-2";
  const subHeader = "text-[8px] text-gray-500 font-bold text-center uppercase";

  return (
    <div className="space-y-6 text-white select-none">
      
      {/* ── 1. MAIN STATISTICS TABLE ─────────────────────── */}
      <section>
        <span className={sectionLabel}>Frequency Distribution</span>
        
        {/* Header */}
        <div className="grid grid-cols-6 gap-x-1 mb-2 px-1">
          {[1,2,3].map(i => (
            <React.Fragment key={i}>
              <span className={subHeader}>#</span>
              <span className={subHeader}>Hit</span>
            </React.Fragment>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-[3px]">
          {rows.map(({ a, b, c }) => (
            <div key={a} className="grid grid-cols-6 gap-x-1 items-center bg-white/[0.02] rounded-sm py-[2px]">
              {[a, b, c].map(num => (
                <React.Fragment key={num}>
                  <div className={`flex items-center justify-center w-6 h-6 rounded-sm text-[10px] font-black ${numBg(num)}`}>
                    {num}
                  </div>
                  <div className={`text-[11px] font-mono text-center ${counts[num] >= maxCount * 0.8 ? 'text-yellow-400 font-bold' : 'text-gray-400'}`}>
                    {counts[num]}
                  </div>
                </React.Fragment>
              ))}
            </div>
          ))}

          {/* Zero Row & Color Totals */}
          <div className="grid grid-cols-6 gap-x-1 items-center mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-center w-6 h-6 rounded-sm text-[10px] font-black bg-[#166534]">0</div>
            <div className="text-[11px] font-mono text-center text-gray-400">{counts[0]}</div>
            <div className="col-span-2 text-[10px] font-black text-center text-[#ef4444] uppercase tracking-tighter bg-red-900/20 py-1 rounded">RED: {redTotal}</div>
            <div className="col-span-2 text-[10px] font-black text-center text-gray-300 uppercase tracking-tighter bg-zinc-800/40 py-1 rounded">BLK: {blackTotal}</div>
          </div>
        </div>
      </section>

      {/* ── 2. GROUPS ────────────────────────────────────── */}
      <section>
        <span className={sectionLabel}>Market Analysis</span>
        <div className="grid grid-cols-2 gap-2">
          {groups.map((g, i) => (
            <div key={i} className="flex justify-between items-center bg-black/40 border border-white/5 rounded-md px-3 py-2">
              <span className="text-[9px] font-black text-gray-500 tracking-wider">{g.label}</span>
              <span className="text-xs font-mono font-bold text-yellow-500/90">{g.val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. SECTORS ───────────────────────────────────── */}
      <section>
        <span className={sectionLabel}>Sector Hits</span>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(SECTORS).map(([letter, nums]) => {
            const count = getFilteredCount(n => nums.includes(n));
            return (
              <div key={letter} className="flex flex-col items-center bg-gradient-to-b from-zinc-800/50 to-black/50 border border-white/5 rounded-lg py-2">
                <span className="text-[12px] font-black text-yellow-500 mb-1">{letter}</span>
                <span className="text-xs font-mono font-bold text-white">{count}</span>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
