import Head from 'next/head';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSpinLogic } from '../lib/useSpinLogic';
import ReferenceWheel from '../components/spin/ReferenceWheel';
import StatsGrid from '../components/spin/StatsGrid';

const LOGO_ROYAL_SPIN = 'https://ibet-games.com/assets/rl2/old_s2w_logo.png';
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function getResultNumber(entry) {
  if (typeof entry === 'object' && entry !== null) return entry.num;
  return entry;
}

function getResultDrawId(entry) {
  if (typeof entry === 'object' && entry !== null) return entry.id;
  return null;
}

function getBallClasses(num) {
  if (num === 0) return 'bg-[#1d952d] text-white';
  return REDS.has(num) ? 'bg-[#8c1117] text-white' : 'bg-[#1d1c1a] text-white';
}

function getResultLabelStyle(num) {
  if (num === 0) {
    return {
      color: '#ffffff',
      background: 'radial-gradient(circle at 35% 35%, #33d85a, #0d5c22)',
      boxShadow: '0 0 22px rgba(77,255,114,0.4)',
    };
  }

  if (REDS.has(num)) {
    return {
      color: '#ffffff',
      background: 'radial-gradient(circle at 35% 35%, #c9222d, #4c0a10)',
      boxShadow: '0 0 22px rgba(255,90,99,0.35)',
    };
  }

  return {
    color: '#ffffff',
    background: 'radial-gradient(circle at 35% 35%, #2d2d2d, #050505)',
    boxShadow: '0 0 18px rgba(255,255,255,0.18)',
  };
}

export default function SpinPage() {
  const { currentDraw, history, loading } = useSpinLogic();
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const [localWinningNumber, setLocalWinningNumber] = useState(null);
  const [spinKey, setSpinKey] = useState(null);
  const [displayedHistory, setDisplayedHistory] = useState([]);

  // 1. TIMER LOOP: Restored the interval so the numbers actually move
  useEffect(() => {
    if (!currentDraw?.ends_at || currentDraw?.status === 'closed') {
      setTimeLeft(0);
      return;
    }

    const tick = () => {
      const now = Date.now();
      const end = new Date(currentDraw.ends_at).getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(diff);
    };

    tick(); // Run immediately
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentDraw?.ends_at, currentDraw?.status]);

  // 2. STATE SYNC: Reset UI for new rounds or trigger spin for closed rounds
  useEffect(() => {
    if (!currentDraw) return;

    // A. RESET UI when a new round opens
    if (currentDraw.status === 'open') {
      setSpinKey(null);
      // We no longer reset localWinningNumber and showWinner here 
      // so it persists until the next round starts spinning.
      return;
    }

    // B. TRIGGER SPIN when the database closes the round
    const winNum = currentDraw.winning_number;
    if (winNum !== null && winNum !== undefined && currentDraw.status === 'closed') {
      // If we haven't started this spin yet (check spinKey)
      const newKey = `${currentDraw.id}:${winNum}`;
      if (spinKey !== newKey) {
        setLocalWinningNumber(winNum);
        setShowWinner(false); 
        setSpinKey(newKey);
      }
    }
  }, [currentDraw?.id, currentDraw?.status, currentDraw?.winning_number, spinKey]);

  // 3. HISTORY SYNC: Buffer history updates until spin is done
  useEffect(() => {
    if (loading || history.length === 0) return;

    // Initial load
    if (displayedHistory.length === 0) {
      setDisplayedHistory(history);
      return;
    }

    const newestHistoryItem = history[0];
    const newestHistoryId = newestHistoryItem.draw_id || newestHistoryItem.id;

    // If the newest history item matches our currently spinning draw, 
    // and we haven't shown the winner yet (meaning it's still spinning),
    // then we WAIT for onSpinComplete to update displayedHistory.
    if (newestHistoryId === currentDraw?.id && currentDraw?.status === 'closed' && !showWinner) {
      // Wait for handleSpinComplete
      return;
    }

    // Otherwise, sync immediately (e.g. for older history or if we're already showing the winner)
    setDisplayedHistory(history);
  }, [history, currentDraw?.id, currentDraw?.status, showWinner, loading, displayedHistory.length]);

  const handleSpinComplete = useCallback(() => {
    setShowWinner(true); 
    setDisplayedHistory(history); // Sync history now that spin is done
  }, [history]);

  // Use the same duration constant as your hook for the progress bar calculation
  const timerProgress = useMemo(() => {
    return Math.max(0, Math.min(1, timeLeft / 90));
  }, [timeLeft]);

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');

  // ... rest of your mapping logic (lastTen, payTable, etc.) and JSX
  
  const lastTen = useMemo(() =>
    displayedHistory
      .slice(0, 10)
      .map((entry) => ({
        // Support both table column naming conventions
        id: entry.draw_id || entry.id,
        num: entry.num ?? entry.winning_number,
      }))
      .filter(({ num }) => num !== null && num !== undefined),
    [displayedHistory]
  );


  const jackpots = [
    { label: 'Gold', tone: 'jackpot-slot--gold', amount: '999,999' },
    { label: 'Silver', tone: 'jackpot-slot--silver', amount: '499,999' },
    { label: 'Bronze', tone: 'jackpot-slot--bronze', amount: '199,999' },
  ];

  const payTable = [
    ['Numbers', 'x 36', 'Dozens', 'x 3'],
    ['Sectors', 'x 6', 'Line', 'x 3'],
    ['Even/Odd', 'x 2', 'High/Low', 'x 2'],
    ['Red', 'x 2', 'Black', 'x 2'],
    ['Neighbours', '3   26   0   32   15', 'Mirrors', '12   21   13   31'],
    ['Twins', '11   22   33', 'Finals', '1   11   21   31'],
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <span className="animate-pulse text-xl font-black tracking-[0.3em] text-yellow-500">INITIALIZING LUCRA...</span>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>InsaSpinAndWin</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        className="spin-page min-h-screen w-full select-none overflow-hidden text-white"
        style={{
          fontFamily: "'Roboto Condensed', sans-serif",
          backgroundColor: '#002114',
          backgroundImage: "radial-gradient(circle at 44%, transparent 0, transparent 45%, rgba(0,0,0,0.96) 100%), url('https://ibet-games.com/assets/rl2/s2w-bg/wooden.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[17%_59%_2%_22%]">
          {/* LEFT SIDEBAR */}
          <aside className="relative flex flex-col items-center justify-center gap-5 px-4 py-6 lg:px-5">
            <div className="flex w-full flex-col gap-3">
              {jackpots.map((jackpot, index) => (
                <div
                  key={jackpot.label}
                  className={`jackpot-slot ${jackpot.tone}`}
                  style={{ animationDelay: `${index * 180}ms` }}
                >
                  <div className="jackpot-slot__label">{jackpot.label}</div>
                  <div className="jackpot-slot__amount">{jackpot.amount}</div>
                </div>
              ))}
            </div>

            <img src={LOGO_ROYAL_SPIN} alt="Royal Spin" className="w-52 max-w-[78%] drop-shadow-[0_0_16px_rgba(255,215,0,0.55)]" />

            <div className="w-full rounded-xl border border-[#ffd70033] bg-white/5 px-4 py-4 text-center shadow-[0_0_10px_rgba(255,215,0,0.08)] backdrop-blur-[8px]">
              <div className="mb-1 text-sm uppercase tracking-[0.2em] text-zinc-300">Draw ID</div>
              <div className="text-4xl font-bold text-[#ffd700]"># {currentDraw?.id || '---'}</div>
            </div>

            <div className="w-full rounded-xl border border-[#ffd70033] bg-white/5 px-4 pt-4 pb-2 text-center shadow-[0_0_10px_rgba(255,215,0,0.08)] backdrop-blur-[8px]">
              <div className="mb-1 text-sm uppercase tracking-[0.2em] text-zinc-300">Bets Close In</div>
              <div
                className={`mt-6 text-4xl font-bold tracking-[0.12em] ${timeLeft < 10 && timeLeft > 0 ? 'animate-pulse text-red-400' : 'text-[#00ff00]'}`}
                style={{ fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' }}
              >
                {mm}:{ss}
              </div>
            </div>

          </aside>

          {/* CENTER WHEEL AREA */}
          <main className="relative flex items-center justify-center overflow-hidden px-1 py-2 lg:px-2 lg:py-1">
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,215,0,0.16)_0%,rgba(0,0,0,0)_58%)]" />
            <div className="relative flex h-full w-full items-center justify-center">
              <ReferenceWheel
                winningNumber={localWinningNumber}
                spinKey={spinKey}
                showCenterValue={!showWinner}
                onSpinComplete={handleSpinComplete}
              />
              {showWinner && localWinningNumber !== null && (
                <div className="spin-result-label" style={getResultLabelStyle(localWinningNumber)}>{localWinningNumber}</div>
              )}
              {currentDraw?.status === 'open' && (
                <div className="waiting-label">Waiting for result</div>
              )}
            </div>
          </main>

          {/* RIGHT SIDEBAR */}
          <div className="pointer-events-none hidden lg:flex items-center justify-start py-6 -ml-2">
            <div className="relative h-full min-h-[520px] w-5 overflow-hidden rounded-full border border-[#f1cf76] bg-[linear-gradient(180deg,rgba(20,20,20,0.32),rgba(0,0,0,0.18))] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_10px_rgba(0,0,0,0.25)] backdrop-blur-[8px]">
              <div
                className="absolute inset-x-[2px] bottom-[2px] rounded-full bg-[linear-gradient(180deg,#8fff78_0%,#2fd34b_38%,#11952d_72%,#0c5b1f_100%)] shadow-[inset_2px_0_3px_rgba(255,255,255,0.35),inset_-2px_0_3px_rgba(0,0,0,0.22),inset_0_2px_4px_rgba(255,255,255,0.25),0_0_14px_rgba(45,211,76,0.4)] transition-all duration-1000 ease-linear"
                style={{ height: `calc(${timerProgress * 100}% - 4px)` }}
              />
            </div>
          </div>

          <aside className="overflow-hidden border-l-2 border-[#ffd700] bg-[#653a1bbd] px-3 py-4 lg:px-4">
            <div className="h-full overflow-y-auto rounded-xl bg-black/10 p-2 spin-scrollbar">
              <section className="mb-3">
                <h3 className="mb-2 text-center text-lg font-bold tracking-[0.12em] text-[#ffd700]">PAY TABLE</h3>
                <div className="overflow-hidden rounded border-2 border-[#d1a24c] bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_rgba(0,0,0,0.34)] backdrop-blur-[3px]">
                  <table className="w-full table-fixed border-collapse text-[17px] font-black">
                    <tbody>
                      {payTable.map(([a, b, c, d]) => (
                        <tr key={`${a}-${c}`}>
                          <td className={`border border-[#916923] px-3 py-1.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-5px_10px_rgba(0,0,0,0.2)] ${a === 'Red' ? 'bg-[linear-gradient(180deg,rgba(172,28,38,0.86),rgba(90,8,15,0.92))] text-white' : 'bg-[linear-gradient(180deg,rgba(110,110,110,0.72),rgba(52,52,52,0.78))]'} ${a === 'Neighbours' || a === 'Twins' ? 'text-[15px] leading-tight' : ''}`}>{a}</td>
                          <td className={`border border-[#5d4315] bg-[linear-gradient(180deg,rgba(56,56,56,0.8),rgba(22,22,22,0.86))] px-2 py-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-4px_8px_rgba(0,0,0,0.28)] ${a === 'Neighbours' || a === 'Twins' ? 'whitespace-pre text-[10px] leading-tight tracking-[0.04em]' : ''}`}>{b}</td>
                          <td className={`border border-[#916923] px-3 py-1.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-5px_10px_rgba(0,0,0,0.2)] ${c === 'Black' ? 'bg-[linear-gradient(180deg,rgba(48,48,48,0.8),rgba(18,18,18,0.9))]' : 'bg-[linear-gradient(180deg,rgba(110,110,110,0.72),rgba(52,52,52,0.78))]'} ${a === 'Neighbours' || a === 'Twins' ? 'text-[15px] leading-tight' : ''}`}>{c}</td>
                          <td className={`border border-[#5d4315] px-2 py-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-4px_8px_rgba(0,0,0,0.28)] ${c === 'Black' ? 'bg-[linear-gradient(180deg,rgba(48,48,48,0.8),rgba(18,18,18,0.9))]' : 'bg-[linear-gradient(180deg,rgba(56,56,56,0.8),rgba(22,22,22,0.86))]'} ${a === 'Neighbours' || a === 'Twins' ? 'whitespace-pre text-[10px] leading-tight tracking-[0.04em]' : ''}`}>{d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mb-3">
                <div className="mb-2 text-base font-bold tracking-[0.12em] text-[#ffd700]">HISTORY</div>
                <div className="overflow-hidden rounded border-2 border-[#d1a24c] bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_18px_rgba(0,0,0,0.32)] backdrop-blur-[3px]">
                  <table className="w-full table-fixed border-collapse text-sm font-bold">
                    <tbody>
                      {Array.from({ length: Math.ceil(lastTen.length / 2) }, (_, rowIndex) => {
                        const left = lastTen[rowIndex * 2];
                        const right = lastTen[rowIndex * 2 + 1];

                        return (
                          <tr key={`history-row-${rowIndex}`}>
                            {[left, right].map((entry, cellIndex) => (
                              <td
                                key={`history-cell-${rowIndex}-${cellIndex}`}
                                className="border border-[#5d4315] bg-[linear-gradient(180deg,rgba(62,62,62,0.78),rgba(24,24,24,0.84))] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-4px_8px_rgba(0,0,0,0.24)]"
                              >
                                {entry ? (
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div
                                      className={`flex h-7 w-7 items-center justify-center rounded-full border border-white text-[12px] font-bold shadow-[0_1px_4px_rgba(0,0,0,0.35)] ${getBallClasses(entry.num)}`}
                                    >
                                      {entry.num}
                                    </div>
                                    <div className="min-w-[78px] text-right text-[13px] font-bold uppercase tracking-[0.08em] text-zinc-300">
                                      ID {entry.id ?? '--'}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-6" />
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <StatsGrid history={displayedHistory} />
            </div>
          </aside>
        </div>
      </div>

      <style jsx global>{`
        .spin-page .spin-result-label {
          position: absolute;
          width: clamp(7rem, 18vh, 11rem);
          height: clamp(7rem, 18vh, 11rem);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(3.4rem, 9vh, 5.8rem);
          line-height: 1;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 0 18px rgba(0, 0, 0, 0.55);
          border-radius: 9999px;
          border: 2px solid rgba(255, 255, 255, 0.18);
        }
        .spin-page .waiting-label {
          position: absolute;
          bottom: -32px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(255, 255, 255, 0.7);
          text-transform: uppercase;
        }
        .spin-page .last-ten-grid { min-height: 70px; justify-items: center; }
        .spin-page .spin-scrollbar::-webkit-scrollbar { width: 8px; }
        .spin-page .spin-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 215, 0, 0.3); border-radius: 9999px; }
        .spin-page .jackpot-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 88px;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 215, 0, 0.2);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.04));
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.08);
          animation: jackpotGlow 2.3s ease-in-out infinite;
        }
        .spin-page .jackpot-slot__label {
          margin-bottom: 0.3rem;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-family: "Roboto Condensed", sans-serif;
        }
        .spin-page .jackpot-slot__amount {
          font-size: 1.4rem;
          line-height: 1;
          letter-spacing: 0.08em;
          font-family: Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.15);
        }
        .spin-page .jackpot-slot--gold {
          color: #f5cd48;
        }
        .spin-page .jackpot-slot--silver {
          color: #d5dbe3;
        }
        .spin-page .jackpot-slot--bronze {
          color: #cf8a47;
        }
        @keyframes jackpotGlow {
          0%, 100% { transform: translateY(0); opacity: 0.92; }
          50% { transform: translateY(-2px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
