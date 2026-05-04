import React, { useState } from 'react';

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

const CHIP_STYLES = [
  { min: 500, base: '#d5a314', dark: '#8e6200', edge: '#fff1bb' },
  { min: 100, base: '#cb71bd', dark: '#873a7f', edge: '#ffe3fd' },
  { min: 50, base: '#41af3f', dark: '#1c6a22', edge: '#dcffd7' },
  { min: 20, base: '#2d86da', dark: '#0e4e9c', edge: '#d7ebff' },
];

function chipLook(amount) {
  return CHIP_STYLES.find((chip) => amount >= chip.min) ?? CHIP_STYLES[CHIP_STYLES.length - 1];
}

function ChipToken({ amount }) {
  const chip = chipLook(amount);
  return (
    <>
      <div
        className="placed-chip-wrapper"
        style={{ ['--chip-base']: chip.base, ['--chip-dark']: chip.dark, ['--chip-edge']: chip.edge }}
      >
        <div className="placed-chip">
          <div className="placed-chip__outer">
            {Array.from({ length: 12 }).map((_, index) => (
              <span
                key={index}
                className="placed-chip__mark"
                style={{ transform: `translate(-50%, -50%) rotate(${index * 30}deg)` }}
              />
            ))}
          </div>
          <div className="placed-chip__inner">
            <span className="placed-chip__value">{amount >= 1000 ? `${Math.round(amount / 1000)}k` : amount}</span>
          </div>
        </div>
      </div>
      <style jsx>{`
        .placed-chip-wrapper {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          pointer-events: none;
          z-index: 4;
        }

        .placed-chip {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 28%, color-mix(in srgb, var(--chip-base) 76%, white 24%), var(--chip-base) 42%, var(--chip-dark) 100%);
          border: 1px solid var(--chip-dark);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
          animation: chipBounce 0.22s ease-out;
        }

        .placed-chip__outer {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
        }

        .placed-chip__mark {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 6px;
          height: 36px;
          border-radius: 9999px;
          background:
            linear-gradient(
              180deg,
              transparent 0 4px,
              var(--chip-edge) 4px 10px,
              transparent 10px 26px,
              var(--chip-edge) 26px 32px,
              transparent 32px 100%
            );
        }

        .placed-chip__inner {
          position: absolute;
          inset: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 28%, #ffffff, #dddddd 70%, #cbcbcb 100%);
          border: 1px solid rgba(0,0,0,0.18);
        }

        .placed-chip__value {
          font-size: 0.88rem;
          line-height: 1;
          font-weight: 900;
          color: #1e1e1e;
        }

        @keyframes chipBounce {
          0% { transform: scale(0.72); }
          70% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}

function BoardCell({ children, betAmount, onClick, className = '', title }) {
  return (
    <button type="button" onClick={onClick} title={title} className={`relative overflow-visible ${className}`}>
      {children}
      {betAmount > 0 && <ChipToken amount={betAmount} />}
    </button>
  );
}

export default function RouletteBoard({ selectedChip = 20, onBetPlaced }) {
  const [bets, setBets] = useState({});

  const placeBet = (key) => {
    setBets((prev) => {
      const updated = { ...prev, [key]: (prev[key] || 0) + selectedChip };
      onBetPlaced?.(updated);
      return updated;
    });
  };

  return (
    <>
      <div className="roulette-board">
        <div className="roulette-board__dozens">
          {['1 - 12', '13 - 24', '25 - 36'].map((range) => (
            <BoardCell
              key={range}
              betAmount={bets[`dozen-${range}`] || 0}
              onClick={() => placeBet(`dozen-${range}`)}
              className="roulette-board__dozen"
            >
              {range}
            </BoardCell>
          ))}
        </div>

        <div className="roulette-board__main">
          <BoardCell
            betAmount={bets['0'] || 0}
            onClick={() => placeBet('0')}
            className="roulette-board__zero"
          >
            0
          </BoardCell>

          <div className="roulette-board__rows">
            {ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="roulette-board__row">
                {row.map((num) => {
                  const betKey = `num-${num}`;
                  return (
                    <BoardCell
                      key={num}
                      betAmount={bets[betKey] || 0}
                      onClick={() => placeBet(betKey)}
                      className={`roulette-board__number ${RED_NUMBERS.has(num) ? 'roulette-board__number--red' : 'roulette-board__number--black'}`}
                    >
                      {num}
                    </BoardCell>
                  );
                })}

                <BoardCell
                  betAmount={bets[`col-${rowIndex + 1}`] || 0}
                  onClick={() => placeBet(`col-${rowIndex + 1}`)}
                  className="roulette-board__column"
                >
                  <span>2 TO 1</span>
                  <span>{rowIndex === 0 ? 'III' : rowIndex === 1 ? 'II' : 'I'}</span>
                </BoardCell>
              </div>
            ))}
          </div>
        </div>

        <div className="roulette-board__outside">
          {[
            { key: '1to18', label: '1 TO 18' },
            { key: 'even', label: 'EVEN' },
            { key: 'red', diamond: 'red' },
            { key: 'black', diamond: 'black' },
            { key: 'odd', label: 'ODD' },
            { key: '19to36', label: '19 TO 36' },
          ].map((item) => (
            <BoardCell
              key={item.key}
              betAmount={bets[item.key] || 0}
              onClick={() => placeBet(item.key)}
              className="roulette-board__outside-cell"
            >
              {item.diamond ? (
                <span className={`roulette-board__diamond roulette-board__diamond--${item.diamond}`} />
              ) : (
                item.label
              )}
            </BoardCell>
          ))}
        </div>
      </div>

      <style jsx>{`
        .roulette-board {
          width: 100%;
          user-select: none;
        }

        .roulette-board__dozens {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 2px;
          margin-left: 76px;
          margin-bottom: 4px;
        }

        .roulette-board__dozen {
          height: 48px;
          border: 2px solid rgba(255,255,255,0.78);
          border-radius: 4px;
          background: rgba(31, 67, 57, 0.55);
          color: #fff;
          font-size: 1.02rem;
          font-weight: 900;
        }

        .roulette-board__main {
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr);
          gap: 2px;
        }

        .roulette-board__zero {
          min-height: 210px;
          border: 2px solid rgba(255,255,255,0.9);
          border-radius: 4px;
          background: #06c400;
          color: #fff;
          font-size: 3rem;
          font-weight: 900;
        }

        .roulette-board__rows {
          display: grid;
          gap: 2px;
        }

        .roulette-board__row {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr)) 72px;
          gap: 2px;
        }

        .roulette-board__number {
          height: 68px;
          border: 2px solid rgba(255,255,255,0.86);
          border-radius: 4px;
          color: #fff;
          font-size: 1.18rem;
          font-weight: 900;
        }

        .roulette-board__number--red {
          background: #ff170f;
        }

        .roulette-board__number--black {
          background: #050505;
        }

        .roulette-board__column {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(255,255,255,0.78);
          border-radius: 4px;
          background: rgba(31, 67, 57, 0.55);
          color: #fff;
          font-size: 0.86rem;
          font-weight: 900;
          line-height: 1.12;
        }

        .roulette-board__outside {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 2px;
          margin-left: 76px;
          margin-top: 4px;
        }

        .roulette-board__outside-cell {
          height: 48px;
          border: 2px solid rgba(255,255,255,0.78);
          border-radius: 4px;
          background: rgba(31, 67, 57, 0.55);
          color: #fff;
          font-size: 0.96rem;
          font-weight: 900;
        }

        .roulette-board__diamond {
          width: 48px;
          height: 24px;
          transform: rotate(-1deg);
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          border: 1px solid rgba(255,255,255,0.75);
        }

        .roulette-board__diamond--red {
          background: #ff170f;
        }

        .roulette-board__diamond--black {
          background: #050505;
        }
      `}</style>
    </>
  );
}
