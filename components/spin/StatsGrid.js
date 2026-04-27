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
  const normalizedHistory = useMemo(
    () => history.map((h) => (typeof h === 'object' ? h.num : h)).filter((n) => n !== undefined && n !== null),
    [history]
  );

  const counts = useMemo(() => {
    const c = {};
    for (let i = 0; i <= 36; i++) c[i] = 0;
    normalizedHistory.forEach((num) => {
      if (num !== undefined && c[num] !== undefined) c[num]++; 
    });
    return c;
  }, [normalizedHistory]);

  const getFilteredCount = (condition) => normalizedHistory.filter(condition).length;
  const rows = Array.from({ length: 12 }, (_, i) => [i + 1, i + 13, i + 25]);
  const lineGroups = [
    ['LN1', getFilteredCount((n) => n >= 1 && n <= 34 && (n - 1) % 3 === 0)],
    ['LN2', getFilteredCount((n) => n >= 2 && n <= 35 && (n - 2) % 3 === 0)],
    ['LN3', getFilteredCount((n) => n >= 3 && n <= 36 && n % 3 === 0)],
  ];
  const dozenGroups = [
    ['1-12', getFilteredCount((n) => n >= 1 && n <= 12)],
    ['2-12', getFilteredCount((n) => n >= 13 && n <= 24)],
    ['3-12', getFilteredCount((n) => n >= 25 && n <= 36)],
  ];
  const halfGroups = [
    ['1-18', getFilteredCount((n) => n >= 1 && n <= 18)],
    ['2-18', getFilteredCount((n) => n >= 19 && n <= 36)],
    ['ODD', getFilteredCount((n) => n > 0 && n % 2 !== 0)],
    ['EVEN', getFilteredCount((n) => n > 0 && n % 2 === 0)],
  ];
  const redTotal = getFilteredCount((n) => REDS.has(n));
  const blackTotal = getFilteredCount((n) => n !== 0 && !REDS.has(n));
  const sectionTitle = 'mb-1 flex items-end justify-between';
  const tableWrap = 'overflow-hidden rounded border-2 border-white';
  const cellBase = 'border border-[#4f4c4c] px-2 py-1 text-center font-bold text-white';
  const labelCell = `${cellBase} bg-[#787878] text-left`;
  const valueCell = `${cellBase} bg-[#353535]`;
  const sectorRows = [['A', 'B', 'C'], ['D', 'E', 'F']];

  return (
    <div className="space-y-4 text-white">
      <section>
        <div className={sectionTitle}>
          <div className="text-base font-bold">STATISTICS</div>
          <div className="text-xs text-zinc-300">last 200 Rounds</div>
        </div>
        <div className={tableWrap}>
          <table className="w-full table-fixed border-collapse text-sm">
            <tbody>
              {rows.map(([a, b, c]) => (
                <tr key={a}>
                  {[a, b, c].map((num) => (
                    <React.Fragment key={num}>
                      <td className={`${cellBase} ${numBg(num)}`}>{num}</td>
                      <td className={valueCell}>{counts[num]}</td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
              <tr>
                <td className={`${cellBase} bg-[#1d952d]`}>0</td>
                <td className={valueCell}>{counts[0]}</td>
                <td className={`${cellBase} bg-[#8c1117]`}>Red</td>
                <td className={valueCell}>{redTotal}</td>
                <td className={`${cellBase} bg-[#1d1c1a]`}>Black</td>
                <td className={valueCell}>{blackTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className={sectionTitle}>
          <div className="text-base font-bold">GROUPS</div>
          <div className="text-xs text-zinc-300">last 200 Rounds</div>
        </div>
        <div className={tableWrap}>
          <table className="w-full table-fixed border-collapse text-sm">
            <tbody>
              <tr>
                {lineGroups.map(([label, value]) => (
                  <React.Fragment key={label}>
                    <td className={labelCell}>{label}</td>
                    <td className={valueCell}>{value}</td>
                  </React.Fragment>
                ))}
              </tr>
              <tr>
                {dozenGroups.map(([label, value]) => (
                  <React.Fragment key={label}>
                    <td className={labelCell}>{label}</td>
                    <td className={valueCell}>{value}</td>
                  </React.Fragment>
                ))}
              </tr>
              <tr>
                <td className={`${labelCell} text-center`} colSpan={2}>1-18</td>
                <td className={valueCell}>{halfGroups[0][1]}</td>
                <td className={`${labelCell} text-center`} colSpan={2}>2-18</td>
                <td className={valueCell}>{halfGroups[1][1]}</td>
              </tr>
              <tr>
                <td className={`${labelCell} text-center`} colSpan={2}>ODD</td>
                <td className={valueCell}>{halfGroups[2][1]}</td>
                <td className={`${labelCell} text-center`} colSpan={2}>EVEN</td>
                <td className={valueCell}>{halfGroups[3][1]}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className={sectionTitle}>
          <div className="text-base font-bold">SECTORS</div>
          <div className="text-xs text-zinc-300">last 200 Rounds</div>
        </div>
        <div className={tableWrap}>
          <table className="w-full table-fixed border-collapse text-sm">
            <tbody>
              {sectorRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((label, labelIndex) => (
                    <React.Fragment key={label}>
                      <td className={`${cellBase} ${labelIndex % 2 === rowIndex % 2 ? 'bg-[#a47338]' : 'bg-[#694d1b]'}`}>{label}</td>
                      <td className={valueCell}>{getFilteredCount((n) => SECTORS[label].includes(n))}</td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
