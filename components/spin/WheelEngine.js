import React, { useEffect, useRef, useState } from 'react';

const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11,
  30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
  29, 7, 28, 12, 35, 3, 26
];
const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const N = WHEEL_NUMBERS.length;
const SEG = (2 * Math.PI) / N;

function numFill(n) {
  if (n === 0) return '#166534';
  return REDS.has(n) ? '#8a1018' : '#111111';
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 4);
}

function drawWheel(ctx, rotation, size, displayNumber, isSpinning) {
  const CX = size / 2, CY = size / 2;
  const R_BORDER = size * 0.494;
  const R_TRACK_OUTER = size * 0.452;
  const R_TRACK_INNER = size * 0.335;
  const R_GOLD_RING = size * 0.318;
  const R_WOODDISC = size * 0.295;
  const R_CONE = size * 0.252;
  const R_HUB = size * 0.145;
  const R_HUBINNER = size * 0.063;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(CX, CY);

  const goldGrad = ctx.createLinearGradient(-R_BORDER, 0, R_BORDER, 0);
  goldGrad.addColorStop(0, '#5a3a00');
  goldGrad.addColorStop(0.2, '#F5CC50');
  goldGrad.addColorStop(0.5, '#C9960C');
  goldGrad.addColorStop(0.8, '#F5CC50');
  goldGrad.addColorStop(1, '#5a3a00');
  ctx.beginPath();
  ctx.arc(0, 0, R_BORDER, 0, 2 * Math.PI);
  ctx.fillStyle = goldGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, R_BORDER * 0.948, 0, 2 * Math.PI);
  ctx.fillStyle = '#100c00';
  ctx.fill();

  const trackGrad = ctx.createRadialGradient(0, 0, R_TRACK_INNER, 0, 0, R_TRACK_OUTER);
  trackGrad.addColorStop(0, '#230d04');
  trackGrad.addColorStop(0.55, '#5d3212');
  trackGrad.addColorStop(1, '#110602');
  ctx.beginPath();
  ctx.arc(0, 0, R_TRACK_OUTER, 0, 2 * Math.PI);
  ctx.fillStyle = trackGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, R_TRACK_INNER, 0, 2 * Math.PI);
  ctx.fillStyle = '#0a0705';
  ctx.fill();

  for (let i = 0; i < N; i++) {
    const startA = rotation + i * SEG - Math.PI / 2;
    const endA = startA + SEG;
    const num = WHEEL_NUMBERS[i];

    ctx.beginPath();
    ctx.arc(0, 0, R_TRACK_OUTER, startA, endA);
    ctx.arc(0, 0, R_TRACK_INNER, endA, startA, true);
    ctx.closePath();
    ctx.fillStyle = numFill(num);
    ctx.fill();
    ctx.strokeStyle = 'rgba(237,197,102,0.75)';
    ctx.lineWidth = Math.max(1, size * 0.0024);
    ctx.stroke();

    const midA = startA + SEG / 2;
    const tx = Math.cos(midA) * ((R_TRACK_OUTER + R_TRACK_INNER) / 2);
    const ty = Math.sin(midA) * ((R_TRACK_OUTER + R_TRACK_INNER) / 2);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(midA + Math.PI / 2);
    ctx.font = `700 ${Math.round(size * 0.03)}px 'Roboto Condensed', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(num, 0, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, R_GOLD_RING, 0, 2 * Math.PI);
  ctx.strokeStyle = '#edc566';
  ctx.lineWidth = size * 0.012;
  ctx.stroke();

  const woodGrad = ctx.createRadialGradient(-R_WOODDISC * 0.25, -R_WOODDISC * 0.25, 0, 0, 0, R_WOODDISC);
  woodGrad.addColorStop(0, '#b77b3d');
  woodGrad.addColorStop(0.55, '#6d4219');
  woodGrad.addColorStop(1, '#2a1406');
  ctx.beginPath();
  ctx.arc(0, 0, R_WOODDISC, 0, 2 * Math.PI);
  ctx.fillStyle = woodGrad;
  ctx.fill();

  const SECTOR_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (let i = 0; i < 6; i++) {
    const a1 = rotation + i * (2 * Math.PI / 6) - Math.PI / 2;
    const a2 = a1 + 2 * Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R_CONE, a1, a2);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.07)';
    ctx.fill();
    
    const midA = a1 + Math.PI / 6;
    const lx = Math.cos(midA) * R_CONE * 0.65;
    const ly = Math.sin(midA) * R_CONE * 0.65;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(midA + Math.PI / 2);
    ctx.font = `900 ${Math.round(size * 0.042)}px 'Roboto Condensed', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SECTOR_LABELS[i], 0, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, R_CONE, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(237,197,102,0.45)';
  ctx.lineWidth = size * 0.004;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, R_HUB, 0, 2 * Math.PI);
  const hubGrad = ctx.createRadialGradient(-R_HUB * 0.3, -R_HUB * 0.3, 0, 0, 0, R_HUB);
  hubGrad.addColorStop(0, '#1f1a16');
  hubGrad.addColorStop(1, '#000000');
  ctx.fillStyle = hubGrad;
  ctx.fill();
  ctx.strokeStyle = '#F5CC50';
  ctx.lineWidth = size * 0.006;
  ctx.stroke();

  if (isSpinning) {
    ctx.font = `700 ${Math.round(size * 0.06)}px 'Roboto Condensed', sans-serif`;
    ctx.fillStyle = '#F5CC50';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('...', 0, 0);
  } else if (displayNumber !== null) {
    ctx.font = `900 ${Math.round(size * 0.1)}px 'Roboto Condensed', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayNumber, 0, 0);
  }

  ctx.beginPath();
  ctx.arc(0, 0, R_HUBINNER, 0, 2 * Math.PI);
  ctx.fillStyle = '#f5cc50';
  ctx.fill();

  for (let i = 0; i < 6; i++) {
    const angle = rotation + i * (Math.PI / 3) - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle - 0.08) * R_HUB * 0.95, Math.sin(angle - 0.08) * R_HUB * 0.95);
    ctx.lineTo(Math.cos(angle + 0.08) * R_HUB * 0.95, Math.sin(angle + 0.08) * R_HUB * 0.95);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.2)';
    ctx.fill();
  }

  ctx.restore();
}

export default function WheelEngine({
  winningNumber,
  spinKey,
  onSpinComplete,
  onSpinStateChange,
  maxSize = 920,
}) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const angleRef = useRef(0);
  const rafRef = useRef(null);
  const isSpinningRef = useRef(false);
  const lastResultRef = useRef(null);
  const lastSpinKeyRef = useRef(null);
  const [size, setSize] = useState(480);

  // Resize Handler
  useEffect(() => {
    const updateSize = () => {
      const wrapper = wrapperRef.current;
      if (wrapper) {
        const nextSize = Math.max(320, Math.min(Math.floor(wrapper.clientWidth), maxSize));
        setSize(nextSize);
        return;
      }

      const fallbackSize = window.innerWidth >= 1024
        ? Math.min(window.innerWidth * 0.54, window.innerHeight * 0.86, maxSize)
        : Math.min(window.innerWidth - 32, window.innerHeight * 0.72, maxSize);
      setSize(Math.max(320, Math.floor(fallbackSize)));
    };

    updateSize();

    const wrapper = wrapperRef.current;
    const resizeObserver = typeof ResizeObserver !== 'undefined' && wrapper
      ? new ResizeObserver(() => updateSize())
      : null;

    if (resizeObserver && wrapper) resizeObserver.observe(wrapper);
    window.addEventListener('resize', updateSize);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [maxSize]);

  // Persistent Animation Loop (Handles Bulbs and Smooth Drawing)
  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.scale(dpr, dpr);

      drawWheel(ctx, angleRef.current, size, lastResultRef.current, isSpinningRef.current);
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size]);

  // Spin Logic Trigger
  useEffect(() => {
    if (!spinKey) {
      lastSpinKeyRef.current = null;
      return;
    }

    if (winningNumber === null || winningNumber === undefined || isSpinningRef.current) return;
    if (lastSpinKeyRef.current === spinKey) return;

    const idx = WHEEL_NUMBERS.indexOf(Number(winningNumber));
    if (idx === -1) return;

    isSpinningRef.current = true;
    if (onSpinStateChange) onSpinStateChange(true);
    lastSpinKeyRef.current = spinKey;
    lastResultRef.current = null;

    const targetAngle = (idx * SEG) + (SEG / 2);
    const offset = (2 * Math.PI - targetAngle) % (2 * Math.PI);
    const totalSpin = (Math.PI * 10) + offset; // 5 full rotations + offset
    const startAngle = angleRef.current;
    const startTime = performance.now();
    const duration = 6000;

    const animateSpin = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      angleRef.current = startAngle + (totalSpin * easeOut(progress));

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        angleRef.current = angleRef.current % (2 * Math.PI);
        isSpinningRef.current = false;
        if (onSpinStateChange) onSpinStateChange(false);
        lastResultRef.current = winningNumber;
        if (onSpinComplete) onSpinComplete();
      }
    };

    requestAnimationFrame(animateSpin);
  }, [winningNumber, spinKey, onSpinComplete, onSpinStateChange]);

  return (
    <div
      ref={wrapperRef}
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <canvas
        ref={canvasRef}
        className="drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]"
        style={{ display: 'block', margin: 'auto' }}
      />
    </div>
  );
}
