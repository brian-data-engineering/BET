import Head from 'next/head';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSpinLogic } from '../lib/useSpinLogic';
import ReferenceWheel from '../components/spin/ReferenceWheel';
import StatsGrid from '../components/spin/StatsGrid';
import { startNextManualRound, triggerManualSpin } from '../lib/spinLoop';

const LOGO_ROYAL_SPIN = 'https://retail.mb.directgames.bet/Content/images/rspin/RoyalSpin.png';
const LOGO_BRAND = '/pushvault-logo.svg';
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const DEMO_ROUND_MS = 15000;

function getResultNumber(entry) {
  if (typeof entry === 'object' && entry !== null) return entry.num;
  return entry;
}

function getBallClasses(num) {
  if (num === 0) return 'bg-[#1d952d] text-white';
  return REDS.has(num) ? 'bg-[#8c1117] text-white' : 'bg-[#1d1c1a] text-white';
}

export default function SpinPage() {
  const { currentDraw, history, loading } = useSpinLogic();
  const [timeLeft, setTimeLeft] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const [localWinningNumber, setLocalWinningNumber] = useState(null);
  const [spinKey, setSpinKey] = useState(null);
  const [demoCurrentDraw, setDemoCurrentDraw] = useState(null);
  const [demoHistory, setDemoHistory] = useState([]);
  const [demoMode, setDemoMode] = useState(false);
  const settlingDrawRef = useRef(null);
  const openingNextRoundRef = useRef(false);
  const demoRoundRef = useRef(1);

  const activeDraw = demoMode ? demoCurrentDraw : currentDraw;
  const activeHistory = demoMode ? demoHistory : history;

  useEffect(() => {
    if (!activeDraw?.ends_at || activeDraw?.status === 'closed') {
      setTimeLeft(0);
      return;
    }

    const tick = () => {
      const now = Date.now();
      const end = new Date(activeDraw.ends_at).getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(diff);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeDraw?.ends_at, activeDraw?.status]);

  useEffect(() => {
    if (!activeDraw) return;

    if (activeDraw.status === 'open') {
      setShowWinner(false);
      setLocalWinningNumber(null);
      setSpinKey(null);
      return;
    }

    const winNum = activeDraw.winning_number;
    if (winNum !== null && winNum !== undefined && activeDraw.status === 'closed') {
      setLocalWinningNumber(winNum);
      setShowWinner(false);
      setSpinKey(`${activeDraw.id}:${winNum}`);
    }
  }, [activeDraw]);

  const handleSpinComplete = useCallback(() => {
    setShowWinner(true);
  }, []);

  useEffect(() => {
    if (demoMode) return;
    if (!currentDraw?.id || currentDraw.status !== 'open') return;
    if (timeLeft > 0) return;
    if (settlingDrawRef.current === currentDraw.id) return;

    settlingDrawRef.current = currentDraw.id;

    let cancelled = false;

    const settleCurrentDraw = async () => {
      try {
        await triggerManualSpin(currentDraw.id);
      } catch (error) {
        console.error('Failed to settle current draw:', error);
        if (!cancelled) settlingDrawRef.current = null;
      }
    };

    settleCurrentDraw();

    return () => {
      cancelled = true;
    };
  }, [currentDraw?.id, currentDraw?.status, timeLeft]);

  useEffect(() => {
    if (demoMode) return;
    if (!currentDraw?.id || currentDraw.status !== 'closed') return;
    if (currentDraw.winning_number === null || currentDraw.winning_number === undefined) return;
    if (openingNextRoundRef.current) return;

    openingNextRoundRef.current = true;

    const timeoutId = setTimeout(async () => {
      try {
        await startNextManualRound();
      } catch (error) {
        console.error('Failed to start next draw:', error);
      } finally {
        openingNextRoundRef.current = false;
        settlingDrawRef.current = null;
      }
    }, 2500);

    return () => clearTimeout(timeoutId);
  }, [currentDraw?.id, currentDraw?.status, currentDraw?.winning_number]);

  useEffect(() => {
    if (demoMode) return;
    if (loading) return;
    if (currentDraw) return;
    if (openingNextRoundRef.current) return;

    openingNextRoundRef.current = true;

    const bootstrapDraw = async () => {
      try {
        await startNextManualRound();
      } catch (error) {
        console.error('Failed to bootstrap first draw:', error);
      } finally {
        openingNextRoundRef.current = false;
      }
    };

    bootstrapDraw();
  }, [loading, currentDraw, demoMode]);

  useEffect(() => {
    if (!loading) return;

    const timeoutId = setTimeout(() => {
      setDemoMode(true);
    }, 3500);

    return () => clearTimeout(timeoutId);
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    if (currentDraw) {
      setDemoMode(false);
      return;
    }

    setDemoMode(true);
  }, [loading, currentDraw]);

  useEffect(() => {
    if (!demoMode) return;

    const openDemoRound = (id) => ({
      id,
      status: 'open',
      winning_number: null,
      ends_at: new Date(Date.now() + DEMO_ROUND_MS).toISOString(),
    });

    if (!demoCurrentDraw) {
      setDemoCurrentDraw(openDemoRound(demoRoundRef.current));
      return;
    }

    if (demoCurrentDraw.status !== 'open' || timeLeft > 0) return;

    const winningNumber = Math.floor(Math.random() * 37);

    setDemoCurrentDraw((prev) => prev ? {
      ...prev,
      status: 'closed',
      winning_number: winningNumber,
    } : prev);

    setDemoHistory((prev) => [{ num: winningNumber }, ...prev].slice(0, 200));

    const nextRoundTimeout = setTimeout(() => {
      demoRoundRef.current += 1;
      setDemoCurrentDraw(openDemoRound(demoRoundRef.current));
    }, 2500);

    return () => clearTimeout(nextRoundTimeout);
  }, [demoMode, demoCurrentDraw, timeLeft]);

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');

  const lastTen = useMemo(
    () => activeHistory.slice(0, 10).map(getResultNumber).filter((num) => num !== null && num !== undefined),
    [activeHistory]
  );

  const payTable = [
    ['Numbers', 'x 36', 'Dozens', 'x 3'],
    ['Sectors', 'x 6', 'Line', 'x 3'],
    ['Even/Odd', 'x 2', 'High/Low', 'x 2'],
    ['Colors', 'x 2', 'Black', 'x 2'],
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
          backgroundImage:
            "radial-gradient(circle at 44%, transparent 0, transparent 45%, rgba(0,0,0,0.96) 100%), url('https://retail.mb.directgames.bet/Content/images/rspin/spinbg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[18%_60%_22%]">
          <aside className="flex flex-col items-center justify-center gap-5 bg-[#653a1bbd] px-4 py-6 lg:px-5">
          <img src={LOGO_ROYAL_SPIN} alt="Royal Spin" className="w-36 max-w-[55%] drop-shadow-[0_0_12px_rgba(255,215,0,0.6)]" />

          <div className="w-full rounded-xl border border-[#ffd70033] bg-white/5 px-4 py-4 text-center shadow-[0_0_10px_rgba(255,215,0,0.08)]">
            <div className="mb-1 text-sm uppercase tracking-[0.2em] text-zinc-300">Draw ID</div>
            <div className="text-4xl font-bold text-[#ffd700]"># {activeDraw?.id || '---'}</div>
            {demoMode && <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] text-orange-300">Demo</div>}
          </div>

          <div className="w-full rounded-xl border border-[#ffd70033] bg-white/5 px-4 py-4 text-center shadow-[0_0_10px_rgba(255,215,0,0.08)]">
            <div className="mb-1 text-sm uppercase tracking-[0.2em] text-zinc-300">Bets Close In</div>
            <div
              className={`font-mono text-4xl font-bold tracking-[0.2em] ${
                timeLeft < 10 ? 'animate-pulse text-red-400' : 'text-[#00ff00]'
              }`}
            >
              {mm}:{ss}
            </div>
          </div>

          <img src={LOGO_BRAND} alt="Brand" className="mt-4 w-28 max-w-[45%] drop-shadow-[0_0_6px_rgba(255,255,255,0.35)]" />
        </aside>

          <main className="relative flex items-center justify-center overflow-hidden px-2 py-3 lg:px-4 lg:py-2">
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,215,0,0.16)_0%,rgba(0,0,0,0)_58%)]" />
            <div className="relative flex h-full w-full items-center justify-center">
              <div className="relative flex items-center justify-center">
                <ReferenceWheel
                  winningNumber={localWinningNumber}
                  spinKey={spinKey}
                  onSpinComplete={handleSpinComplete}
                />
                {showWinner && localWinningNumber !== null && (
                  <div className="spin-result-label">{localWinningNumber}</div>
                )}
                {!showWinner && localWinningNumber === null && (
                  <div className="waiting-label">Waiting for result</div>
                )}
                </div>
            </div>
          </main>

          <aside className="overflow-hidden border-l-2 border-[#ffd700] bg-[#653a1bbd] px-3 py-4 lg:px-4">
            <div className="h-full overflow-y-auto rounded-xl bg-black/10 p-2 spin-scrollbar">
              <section className="mb-4">
                <h3 className="mb-2 text-center text-lg font-bold text-[#ffd700]">PAY TABLE</h3>
                <div className="overflow-hidden rounded border-2 border-white">
                  <table className="w-full table-fixed border-collapse text-sm font-bold">
                    <tbody>
                      {payTable.map(([a, b, c, d]) => (
                        <tr key={`${a}-${c}`}>
                          <td className="border border-[#4f4c4c] bg-[#787878] px-2 py-1 text-left text-white">{a}</td>
                          <td className="border border-[#4f4c4c] bg-[#353535] px-2 py-1 text-center text-white">{b}</td>
                          <td className={`border border-[#4f4c4c] px-2 py-1 text-left text-white ${c === 'Black' ? 'bg-[#1d1c1a]' : 'bg-[#787878]'}`}>{c}</td>
                          <td className={`border border-[#4f4c4c] px-2 py-1 text-center text-white ${c === 'Black' ? 'bg-[#1d1c1a]' : 'bg-[#353535]'}`}>{d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mb-4">
                <div className="mb-2 text-base font-bold">LAST 10</div>
                <div className="rounded-md bg-[#363636] px-2 py-2">
                  <div className="last-ten-grid grid grid-cols-5 gap-1 lg:grid-cols-5">
                    {lastTen.map((num, index) => (
                      <div
                        key={`${num}-${index}`}
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${getBallClasses(num)}`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <StatsGrid history={activeHistory} />
            </div>
          </aside>
        </div>
      </div>

      <style jsx global>{`
        .spin-page .spin-result-label {
          position: absolute;
          font-size: clamp(5rem, 14vh, 9rem);
          line-height: 1;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 0 18px rgba(0, 0, 0, 0.55);
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

        .spin-page .last-ten-grid {
          min-height: 70px;
          justify-items: center;
        }

        .spin-page .spin-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .spin-page .spin-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 215, 0, 0.3);
          border-radius: 9999px;
        }

        @media (max-width: 1023px) {
          .spin-page {
            overflow-y: auto;
          }
        }

        @media (min-height: 1000px) and (min-width: 1024px) {
          .spin-page .last-ten-grid {
            gap: 0.35vh;
          }

          .spin-page .last-ten-grid > div {
            width: 3vh;
            height: 3vh;
            font-size: 1.6vh;
          }
        }
      `}</style>
    </>
  );
}
