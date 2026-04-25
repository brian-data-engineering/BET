import React, { useMemo } from 'react';

const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

const SECTORS = {
  A: [1,2,3,4,5,6],
  B: [7,8,9,10,11,12],
  C: [13,14,15,16,17,18],
  D: [19,20,21,22,23,24],
  E: [25,26,27,28,29,30],
  F: [31,32,33,34,35,36,0],
};

function numBg(n) {
  if (n === 0) return 'bg-green-700';
  return REDS.has(n) ? 'bg-red-700' : 'bg-zinc-800';
}

function numText(n) {
  if (n === 0) return 'text-white';
  return 'text-white';
}

const Cell = ({ n, count, highlight }) => (
  <div className={`flex items-center justify-between px-2 py-[5px] rounded ${highlight ? 'ring-1 ring-yellow-500/60' : ''}`}>
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-black ${numBg(n)} ${numText(n)}`}>
      {n}
    </span>
    <span className="text-xs font-mono text-gray-300 tabular-nums">{count}</span>
  </div>
);

export default function StatsGrid({ history = [] }) {
  const counts = useMemo(() => {
    const c = {};
    for (let i = 0; i <= 36; i++) c[i] = 0;
    history.forEach(h => { if (h.num !== undefined) c[h.num] = (c[h.num] || 0) + 1; });
    return c;
  }, [history]);

  const maxCount = useMemo(() => Math.max(...Object.values(counts), 1), [counts]);

  // Stats: rows of [left num, right num] pairing 1-12 with 13-24 with 25-36
  // Layout matches screenshot: 3 columns, rows 1–12 on left, 13–24 mid, 25–36 right
  // Actually screenshot shows: num | count | num | count | num | count  — 6 cols, 12 rows
  const rows = Array.from({ length: 12 }, (_, i) => ({
    a: i + 1,
    b: i + 13,
    c: i + 25,
  }));

  const redTotal   = history.filter(h => REDS.has(h.num)).length;
  const blackTotal = history.filter(h => h.num !== 0 && !REDS.has(h.num)).length;
  const zeroTotal  = counts[0] || 0;

  // Groups
  const ln1 = history.filter(h => h.num >= 1  && h.num <= 12).length;
  const ln2 = history.filter(h => h.num >= 13 && h.num <= 24).length;
  const ln3 = history.filter(h => h.num >= 25 && h.num <= 36).length;
  const d1  = history.filter(h => h.num >= 1  && h.num <= 12).length; // same as ln1
  const d2  = history.filter(h => h.num >= 13 && h.num <= 24).length;
  const d3  = history.filter(h => h.num >= 25 && h.num <= 36).length;
  const r118  = history.filter(h => h.num >= 1  && h.num <= 18).length;
  const r1936 = history.filter(h => h.num >= 19 && h.num <= 36).length;
  const odd   = history.filter(h => h.num > 0 && h.num % 2 !== 0).length;
  const even  = history.filter(h => h.num > 0 && h.num % 2 === 0).length;

  const sectorCounts = useMemo(() => {
    const sc = {};
    Object.entries(SECTORS).forEach(([label, nums]) => {
      sc[label] = history.filter(h => nums.includes(h.num)).length;
    });
    return sc;
  }, [history]);

  const label = 'text-[10px] font-black uppercase tracking-widest text-gray-400';
  const subLabel = 'last ' + history.length + ' Rounds';

  return (
    <div className="space-y-4 text-white select-none">

      {/* ── STATISTICS TABLE ───────────────────────────────── */}
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <span className={label}>Statistics</span>
          <span className="text-[9px] text-gray-500 font-mono">{subLabel}</span>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-6 gap-x-1 mb-[2px]">
          {['#','Hits','#','Hits','#','Hits'].map((h, i) => (
            <span key={i} className="text-[8px] text-gray-500 font-bold text-center">{h}</span>
          ))}
        </div>

        {/* 12 rows × 3 numbers */}
        <div className="space-y-[2px]">
          {rows.map(({ a, b, c }) => {
            const hot = n => counts[n] >= maxCount * 0.7;
            return (
              <div key={a} className="grid grid-cols-6 gap-x-1 items-center">
                {/* Col A */}
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-black ${numBg(a)} mx-auto`}>{a}</span>
                <span className={`text-xs font-mono text-center tabular-nums ${hot(a) ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}>{counts[a]}</span>
                {/* Col B */}
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-black ${numBg(b)} mx-auto`}>{b}</span>
                <span className={`text-xs font-mono text-center tabular-nums ${hot(b) ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}>{counts[b]}</span>
                {/* Col C */}
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-black ${numBg(c)} mx-auto`}>{c}</span>
                <span className={`text-xs font-mono text-center tabular-nums ${hot(c) ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}>{counts[c]}</span>
              </div>
            );
          })}

          {/* 0 row + Red / Black totals */}
          <div className="grid grid-cols-6 gap-x-1 items-center mt-1 pt-1 border-t border-white/10">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-black bg-green-700 mx-auto">0</span>
            <span className="text-xs font-mono text-center text-gray-300">{zeroTotal}</span>
            <span className="col-span-2 text-xs font-bold text-center text-red-400">Red {redTotal}</span>
            <span className="col-span-2 text-xs font-bold text-center text-gray-300">Black {blackTotal}</span>
          </div>
        </div>
      </div>

      {/* ── GROUPS ─────────────────────────────────────────── */}
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <span className={label}>Groups</span>
          <span className="text-[9px] text-gray-500 font-mono">{subLabel}</span>
        </div>

        <div className="space-y-[3px]">
          {/* Dozens */}
          <div className="grid grid-cols-3 gap-1">
            {[['LN1', ln1], ['LN2', ln2], ['LN3', ln3]].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center bg-zinc-800/60 rounded px-2 py-1">
                <span className="text-[10px] font-black text-gray-400">{k}</span>
                <span className="text-xs font-mono font-bold text-white">{v}</span>
              </div>
            ))}
          </div>
          {/* 1-12 / 13-24 / 25-36 */}
          <div className="grid grid-cols-3 gap-1">
            {[['1-12', d1], ['13-24', d2], ['25-36', d3]].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center bg-zinc-800/40 rounded px-2 py-1">
                <span className="text-[9px] font-bold text-gray-500">{k}</span>
                <span className="text-xs font-mono text-gray-300">{v}</span>
              </div>
            ))}
          </div>
          {/* 1-18 / 19-36 */}
          <div className="grid grid-cols-2 gap-1">
            {[['1-18', r118], ['19-36', r1936]].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center bg-zinc-800/40 rounded px-2 py-1">
                <span className="text-[9px] font-bold text-gray-500">{k}</span>
                <span className="text-xs font-mono text-gray-300">{v}</span>
              </div>
            ))}
          </div>
          {/* Odd / Even */}
          <div className="grid grid-cols-2 gap-1">
            {[['ODD', odd], ['EVEN', even]].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center bg-zinc-800/40 rounded px-2 py-1">
                <span className="text-[9px] font-bold text-gray-500">{k}</span>
                <span className="text-xs font-mono text-gray-300">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTORS ────────────────────────────────────────── */}
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <span className={label}>Sectors</span>
          <span className="text-[9px] text-gray-500 font-mono">{subLabel}</span>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {Object.entries(sectorCounts).map(([letter, count]) => (
            <div key={letter} className="flex justify-between items-center bg-zinc-800/60 rounded px-2 py-1">
              <span className="text-[10px] font-black text-yellow-500">{letter}</span>
              <span className="text-xs font-mono font-bold text-white">{count}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
