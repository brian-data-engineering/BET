import { useState, useEffect } from 'react';

export default function Timer({ initialSeconds = 74, phase = 'BETTING' }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [mounted, setMounted] = useState(false);
  const totalDuration = initialSeconds;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (seconds > 0 && phase === 'BETTING') {
      const timer = setInterval(() => setSeconds((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [seconds, phase]);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (seconds / totalDuration) * circumference;
  const isUrgent = seconds <= 10;

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Current time for the secondary display
  const now = mounted ? new Date() : null;
  const timeStr = now
    ? `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    : '00:00';

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: isUrgent
            ? '0 0 20px 4px rgba(239,68,68,0.5)'
            : '0 0 15px 2px rgba(255,255,255,0.1)',
          transition: 'box-shadow 0.5s ease',
          borderRadius: '50%'
        }}
      />

      <svg className="w-full h-full" viewBox="0 0 128 128">
        {/* BG track */}
        <circle cx="64" cy="64" r={radius} stroke="#1a1a1a" strokeWidth="7" fill="black" />
        {/* Progress arc */}
        <circle
          cx="64" cy="64" r={radius}
          stroke={isUrgent ? '#ef4444' : '#ffffff'}
          strokeWidth="7"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
        />
      </svg>

      {/* Text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-2xl font-black leading-none tabular-nums"
          style={{
            color: isUrgent ? '#ef4444' : '#ffffff',
            fontFamily: 'monospace',
            transition: 'color 0.3s ease'
          }}
          suppressHydrationWarning
        >
          {formatTime(seconds)}
        </span>
        <span className="text-[9px] font-bold text-red-500 mt-0.5 tabular-nums" suppressHydrationWarning>
          {timeStr}
        </span>
      </div>

      {/* Urgent pulse ring */}
      {isUrgent && (
        <div className="absolute inset-0 rounded-full border-2 border-red-500/40 animate-ping pointer-events-none" />
      )}
    </div>
  );
}
