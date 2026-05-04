import React from 'react';

export default function Sectors({ onSectorClick }) {
  const sectors = ['A', 'B', 'C', 'D', 'E', 'F'];

  const getArcPath = (index, outerR, innerR) => {
    const total = sectors.length;
    const startAngle = ((index / total) * 360 - 90) * (Math.PI / 180);
    const endAngle = (((index + 1) / total) * 360 - 90) * (Math.PI / 180);
    const cx = 100, cy = 100;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);

    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z`;
  };

  const getLabelPos = (index, r = 65) => {
    const total = sectors.length;
    const angle = ((index + 0.5) / total * 360 - 90) * (Math.PI / 180);
    return {
      x: 100 + r * Math.cos(angle),
      y: 100 + r * Math.sin(angle),
    };
  };

  return (
    <div className="relative w-56 h-56 flex items-center justify-center select-none">
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
        <defs>
          <radialGradient id="sectorGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f8b808" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background fill */}
        <circle cx="100" cy="100" r="85" fill="#0a1a10" />

        {/* Outer golden ring */}
        <circle cx="100" cy="100" r="84" fill="none" stroke="#f8b808" strokeWidth="1.5" opacity="0.5" />

        {/* Sectors */}
        {sectors.map((label, i) => {
          const labelPos = getLabelPos(i);
          return (
            <g key={label} className="cursor-pointer group" onClick={() => onSectorClick?.(label)}>
              {/* Sector slice */}
              <path
                d={getArcPath(i, 82, 44)}
                fill="rgba(0,0,0,0.3)"
                stroke="#f8b808"
                strokeWidth="1.2"
                style={{ transition: 'fill 0.2s' }}
                onMouseEnter={e => e.currentTarget.setAttribute('fill', 'rgba(248,184,8,0.15)')}
                onMouseLeave={e => e.currentTarget.setAttribute('fill', 'rgba(0,0,0,0.3)')}
              />
              {/* Label */}
              <text
                x={labelPos.x}
                y={labelPos.y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="13"
                fontWeight="900"
                fontStyle="italic"
                style={{ pointerEvents: 'none', letterSpacing: '0.05em' }}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Inner gold ring */}
        <circle cx="100" cy="100" r="44" fill="#0d1f13" stroke="#f8b808" strokeWidth="2" />
        <circle cx="100" cy="100" r="42" fill="none" stroke="#f8b808" strokeWidth="0.5" opacity="0.4" />

        {/* Center label */}
        <text
          x="100" y="98"
          fill="#f8b808"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="10"
          fontWeight="900"
          letterSpacing="1"
        >
          SECTORS
        </text>
      </svg>
    </div>
  );
}
