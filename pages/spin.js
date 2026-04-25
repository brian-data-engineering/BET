import React, { useState, useEffect } from 'react';
import { useSpinLogic } from '../lib/useSpinLogic';
import WheelEngine from '../components/spin/WheelEngine';
import StatsGrid from '../components/spin/StatsGrid';
import SectorsDisplay from '../components/spin/SectorsDisplay';

export default function SpinPage() {
  const { currentDraw, history } = useSpinLogic();
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  // 1. The Countdown Timer Logic
  useEffect(() => {
    if (!currentDraw?.ends_at) return;

    const timer = setInterval(() => {
      const end = new Date(currentDraw.ends_at).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      
      setTimeLeft(diff);

      // If time hits 0, the backend should be updating to 'locked' or 'spinning'
      if (diff === 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentDraw]);

  // 2. Handle what happens when the wheel finishes its rotation
  const handleSpinComplete = () => {
    setIsSpinning(false);
    // You could trigger a 'Winner' toast or sound effect here
  };

  // 3. Detect when the database provides a winning number
  useEffect(() => {
    if (currentDraw?.winning_number !== null) {
      setIsSpinning(true);
    }
  }, [currentDraw?.winning_number]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4 font-sans">
      {/* Header Info */}
      <div className="flex justify-between items-center mb-6 bg-black p-4 rounded-lg border border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-yellow-500">LUCRA SPIN</h1>
          <p className="text-xs text-gray-400">DRAW ID: #{currentDraw?.id || '---'}</p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase text-gray-400">Next Draw In</p>
          <p className={`text-3xl font-mono ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
            {formatTime(timeLeft)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Stats & Sectors */}
        <div className="space-y-6">
          <SectorsDisplay history={history} />
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-sm font-bold mb-2">LAST 10 ROUNDS</h3>
            <div className="flex gap-2">
              {history.slice(0, 10).map((h, i) => (
                <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                  h.color === 'red' ? 'bg-red-600' : h.color === 'black' ? 'bg-gray-900' : 'bg-green-600'
                }`}>
                  {h.num}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER: The Wheel */}
        <div className="flex flex-col items-center justify-center bg-black/50 rounded-3xl p-8 border border-white/10">
          <WheelEngine 
            winningNumber={currentDraw?.winning_number} 
            onSpinComplete={handleSpinComplete} 
          />
          {isSpinning && (
            <div className="mt-4 text-yellow-500 font-bold text-xl animate-bounce">
              SPINNING...
            </div>
          )}
        </div>

        {/* RIGHT: The 1-36 Stats Grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold px-2">NUMBER FREQUENCY (LAST 200)</h3>
          <StatsGrid history={history} />
        </div>
      </div>
    </div>
  );
}
