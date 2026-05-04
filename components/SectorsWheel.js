import React from 'react';

const sectors = [
  { id: `A`, path: `M 100 100 L 100 20 A 80 80 0 0 1 156.5 43.5 Z` },
  { id: `B`, path: `M 100 100 L 156.5 43.5 A 80 80 0 0 1 180 100 Z` },
  { id: `C`, path: `M 100 100 L 180 100 A 80 80 0 0 1 156.5 156.5 Z` },
  { id: `D`, path: `M 100 100 L 156.5 156.5 A 80 80 0 0 1 100 180 Z` },
  { id: `E`, path: `M 100 100 L 43.5 156.5 A 80 80 0 0 1 20 100 Z` },
  { id: `F`, path: `M 100 100 L 20 100 A 80 80 0 0 1 43.5 43.5 Z` },
];

export default function SectorsWheel({ onSectorClick }) {
  return (
    <div className="relative w-64 h-64 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {sectors.map((s) => (
          <path
            key={s.id}
            d={s.path}
            onClick={() => onSectorClick(s.id)}
            className="cursor-pointer fill-transparent stroke-[#fbbf24] stroke-2 hover:fill-emerald-500/20 transition-colors"
          />
        ))}
        <circle cx="100" cy="100" r="30" fill="#111827" stroke="#fbbf24" strokeWidth="2" />
        <text x="100" y="105" textAnchor="middle" fill="#fbbf24" className="text-[10px] font-bold">SECTORS</text>
      </svg>
    </div>
  );
}
