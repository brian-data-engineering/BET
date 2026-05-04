import React from 'react';

const CHIPS = [
  { value: 20, base: '#2d86da', dark: '#0e4e9c', edge: '#d7ebff' },
  { value: 50, base: '#41af3f', dark: '#1c6a22', edge: '#dcffd7' },
  { value: 100, base: '#cb71bd', dark: '#873a7f', edge: '#ffe3fd' },
  { value: 500, base: '#d5a314', dark: '#8e6200', edge: '#fff1bb' },
];

function CasinoChip({ chip, active }) {
  return (
    <div
      className={`casinochip-wrapper ${active ? 'selected' : ''}`}
      data-amount={chip.value}
      style={{ ['--chip-base']: chip.base, ['--chip-dark']: chip.dark, ['--chip-edge']: chip.edge }}
    >
      <div className="casinochip">
        <div className="casinochip__outer">
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={index}
              className="casinochip__mark"
              style={{ transform: `translate(-50%, -50%) rotate(${index * 30}deg)` }}
            />
          ))}
        </div>
        <div className="casinochip__inner">
          <div className="casinochip__value">{chip.value}</div>
        </div>
      </div>
    </div>
  );
}

export default function ChipSelector({ activeChip, onSelect }) {
  return (
    <>
      <div className="casinochip-container">
        {CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => onSelect?.(chip.value)}
            className="bg-transparent p-0"
          >
            <CasinoChip chip={chip} active={activeChip === chip.value} />
          </button>
        ))}
      </div>

      <style jsx>{`
        .casinochip-container {
          display: flex;
          align-items: flex-end;
          gap: 18px;
        }

        .casinochip-wrapper {
          width: 74px;
          height: 74px;
          transition: transform 160ms ease, filter 160ms ease, opacity 160ms ease;
          opacity: 0.92;
        }

        .casinochip-wrapper.selected {
          transform: translateY(-2px) scale(1.04);
          filter: drop-shadow(0 0 10px color-mix(in srgb, var(--chip-base) 72%, transparent));
          opacity: 1;
        }

        .casinochip {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 28%, color-mix(in srgb, var(--chip-base) 76%, white 24%), var(--chip-base) 42%, var(--chip-dark) 100%);
          border: 2px solid var(--chip-dark);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.45), inset 0 2px 5px rgba(255, 255, 255, 0.28);
        }

        .casinochip__outer {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
        }

        .casinochip__mark {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 10px;
          height: 66px;
          border-radius: 9999px;
          background:
            linear-gradient(
              180deg,
              transparent 0 6px,
              var(--chip-edge) 6px 18px,
              transparent 18px 48px,
              var(--chip-edge) 48px 60px,
              transparent 60px 100%
            );
          transform-origin: center;
        }

        .casinochip__inner {
          position: absolute;
          inset: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 28%, #ffffff, #dedede 70%, #c9c9c9 100%);
          border: 2px solid rgba(0, 0, 0, 0.18);
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.9);
        }

        .casinochip__value {
          font-size: 1.05rem;
          font-weight: 900;
          color: #222;
          line-height: 1;
        }
      `}</style>
    </>
  );
}
