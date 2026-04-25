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
  const R_OUTER = size * 0.455;
  const R_INNER = size * 0.300;
  const R_WOODDISC = size * 0.292;
  const R_DIAMOND = size * 0.268;
  const R_CONE = size * 0.252;
  const R_HUB = size * 0.148;
  const R_HUBINNER = size * 0.060;

  ctx.clearRect(0, 0, size, size);

  // 1. Outer gold border
  const goldGrad = ctx.createLinearGradient(CX - R_BORDER, CY, CX + R_BORDER, CY);
  goldGrad.addColorStop(0, '#5a3a00');
  goldGrad.addColorStop(0.2, '#F5CC50');
  goldGrad.addColorStop(0.5, '#C9960C');
  goldGrad.addColorStop(0.8, '#F5CC50');
  goldGrad.addColorStop(1, '#5a3a00');
  ctx.beginPath();
  ctx.arc(CX, CY, R_BORDER, 0, 2 * Math.PI);
  ctx.fillStyle = goldGrad;
  ctx.fill();

  // 2. Dark rim
  ctx.beginPath();
  ctx.arc(CX, CY, R_BORDER * 0.948, 0, 2 * Math.PI);
  ctx.fillStyle = '#100c00';
  ctx.fill();

  // 3. Number segments
  for (let i = 0; i < N; i++) {
    const startA = rotation + i * SEG - Math.PI / 2;
    const endA = startA + SEG;
    const num = WHEEL_NUMBERS[i];

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R_OUTER, startA, endA);
    ctx.closePath();
    ctx.fillStyle = numFill(num);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,150,12,0.6)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const midA = startA + SEG / 2;
    const tx = CX + Math.cos(midA) * ((R_OUTER + R_INNER) / 2);
    const ty = CY + Math.sin(midA) * ((R_OUTER + R_INNER) / 2);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(midA + Math.PI / 2);
    ctx.font = `bold ${Math.round(size * 0.027)}px 'DM Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(num, 0, 0);
    ctx.restore();
  }

  // 4. Inner gold ring
  ctx.beginPath();
  ctx.arc(CX, CY, R_INNER, 0, 2 * Math.PI);
  ctx.strokeStyle = '#C9960C';
  ctx.lineWidth = size * 0.013;
  ctx.stroke();

  // 5. Wood-tone inner disc
  const woodGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, R_WOODDISC);
  woodGrad.addColorStop(0, '#c49050');
  woodGrad.addColorStop(1, '#633e11');
  ctx.beginPath();
  ctx.arc(CX, CY, R_WOODDISC, 0, 2 * Math.PI);
  ctx.fillStyle = woodGrad;
  ctx.fill();

  // 6. Cone sectors A–F
  const SECTOR_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (let i = 0; i < 6; i++) {
    const a1 = rotation + i * (2 * Math.PI / 6) - Math.PI / 2;
    const a2 = a1 + 2 * Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R_CONE, a1, a2);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.05)';
    ctx.fill();
    
    const midA = a1 + Math.PI / 6;
    const lx = CX + Math.cos(midA) * R_CONE * 0.65;
    const ly = CY + Math.sin(midA) * R_CONE * 0.65;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(midA + Math.PI / 2);
    ctx.font = `900 ${Math.round(size * 0.04)}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(SECTOR_LABELS[i], 0, 0);
    ctx.restore();
  }

  // 9. Center hub cap
  ctx.beginPath();
  ctx.arc(CX, CY, R_HUB, 0, 2 * Math.PI);
  ctx.fillStyle = '#000000';
  ctx.fill();
  ctx.strokeStyle = '#F5CC50';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 10. Result Display
  if (isSpinning) {
    ctx.font = `bold ${Math.round(size * 0.06)}px monospace`;
    ctx.fillStyle = '#F5CC50';
    ctx.fillText('...', CX, CY);
  } else if (displayNumber !== null) {
    ctx.font = `900 ${Math.round(size * 0.1)}px sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayNumber, CX, CY);
  }

  // 12. FLASHING LIGHT BULBS
  const BULBS = 26;
  const isSecond = Math.floor(Date.now() / 500) % 2 === 0;
  for (let i = 0; i < BULBS; i++) {
    const a = i * (2 * Math.PI / BULBS);
    const bx = CX + Math.cos(a) * (R_BORDER * 0.948);
    const by = CY + Math.sin(a) * (R_BORDER * 0.948);
    const on = isSecond ? (i % 2 === 0) : (i % 2 !== 0);
    
    ctx.beginPath();
    ctx.arc(bx, by, size * 0.015, 0, 2 * Math.PI);
    ctx.fillStyle = on ? '#FFF176' : '#332200';
    if (on) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 10;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // 13. Gold pointer
  ctx.beginPath();
  ctx.moveTo(CX, CY - R_OUTER + 5);
  ctx.lineTo(CX - 12, CY - R_BORDER);
  ctx.lineTo(CX + 12, CY - R_BORDER);
  ctx.closePath();
  ctx.fillStyle = '#F5CC50';
  ctx.fill();
}

export default function WheelEngine({ winningNumber, onSpinComplete }) {
  const canvasRef = useRef(null);
  const angleRef = useRef(0);
  const rafRef = useRef(null);
  const isSpinningRef = useRef(false);
  const lastResultRef = useRef(null);
  const [size, setSize] = useState(480);

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
      const s = Math.min(window.innerWidth - 40, 500);
      setSize(s);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (winningNumber === null || winningNumber === undefined || isSpinningRef.current) return;

    const idx = WHEEL_NUMBERS.indexOf(Number(winningNumber));
    if (idx === -1) return;

    isSpinningRef.current = true;
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
        lastResultRef.current = winningNumber;
        if (onSpinComplete) onSpinComplete();
      }
    };

    requestAnimationFrame(animateSpin);
  }, [winningNumber]);

  return (
    <canvas
      ref={canvasRef}
      className="drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]"
      style={{ display: 'block', margin: 'auto' }}
    />
  );
}
