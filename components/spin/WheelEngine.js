import React, { useEffect, useRef, useState } from 'react';

const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11,
  30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
  29, 7, 28, 12, 35, 3, 26
];
const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const N   = WHEEL_NUMBERS.length;
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

  const R_BORDER   = size * 0.494;
  const R_OUTER    = size * 0.455;
  const R_INNER    = size * 0.300;
  const R_WOODDISC = size * 0.292;
  const R_DIAMOND  = size * 0.268;
  const R_CONE     = size * 0.252;
  const R_HUB      = size * 0.148;  // bigger hub so number fits
  const R_HUBINNER = size * 0.060;

  ctx.clearRect(0, 0, size, size);

  // 1. Outer gold border
  const goldGrad = ctx.createLinearGradient(CX - R_BORDER, CY, CX + R_BORDER, CY);
  goldGrad.addColorStop(0,    '#5a3a00');
  goldGrad.addColorStop(0.2,  '#F5CC50');
  goldGrad.addColorStop(0.5,  '#C9960C');
  goldGrad.addColorStop(0.8,  '#F5CC50');
  goldGrad.addColorStop(1,    '#5a3a00');
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
    const endA   = startA + SEG;
    const num    = WHEEL_NUMBERS[i];

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R_OUTER, startA, endA);
    ctx.closePath();
    ctx.fillStyle = numFill(num);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,150,12,0.6)';
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // Number label
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
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur  = 4;
    ctx.fillText(num, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // 4. Inner gold separator ring
  const innerGold = ctx.createLinearGradient(CX - R_INNER, CY, CX + R_INNER, CY);
  innerGold.addColorStop(0,   '#5a3a00');
  innerGold.addColorStop(0.4, '#F5CC50');
  innerGold.addColorStop(0.6, '#C9960C');
  innerGold.addColorStop(1,   '#5a3a00');
  ctx.beginPath();
  ctx.arc(CX, CY, R_INNER, 0, 2 * Math.PI);
  ctx.strokeStyle = innerGold;
  ctx.lineWidth   = size * 0.013;
  ctx.stroke();

  // 5. Wood-tone inner disc
  const woodGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, R_WOODDISC);
  woodGrad.addColorStop(0,   '#ddb86e');
  woodGrad.addColorStop(0.5, '#c49050');
  woodGrad.addColorStop(1,   '#9a6c28');
  ctx.beginPath();
  ctx.arc(CX, CY, R_WOODDISC, 0, 2 * Math.PI);
  ctx.fillStyle = woodGrad;
  ctx.fill();

  // 6. Cone sectors A–F (rotate with wheel)
  const SECTOR_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (let i = 0; i < 6; i++) {
    const a1 = rotation + i * (2 * Math.PI / 6) - Math.PI / 2;
    const a2 = a1 + 2 * Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R_CONE, a1, a2);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.07)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,0,0.5)';
    ctx.lineWidth   = 0.6;
    ctx.stroke();

    const midA = a1 + Math.PI / 6;
    const lx = CX + Math.cos(midA) * R_CONE * 0.62;
    const ly = CY + Math.sin(midA) * R_CONE * 0.62;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(midA + Math.PI / 2);
    ctx.font = `900 ${Math.round(size * 0.044)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(45,24,0,0.9)';
    ctx.fillText(SECTOR_LABELS[i], 0, 0);
    ctx.restore();
  }

  // 7. Diamond separators on cone ring
  for (let i = 0; i < N; i++) {
    const a  = rotation + i * SEG - Math.PI / 2;
    const dx = CX + Math.cos(a) * R_DIAMOND;
    const dy = CY + Math.sin(a) * R_DIAMOND;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(a + Math.PI / 4);
    const d = size * 0.009;
    ctx.beginPath();
    ctx.rect(-d, -d, d * 2, d * 2);
    ctx.fillStyle = '#D4A017';
    ctx.fill();
    ctx.restore();
  }

  // 8. Hub gold outer ring
  const hubGrad = ctx.createLinearGradient(CX - R_HUB, CY, CX + R_HUB, CY);
  hubGrad.addColorStop(0,   '#5a3a00');
  hubGrad.addColorStop(0.5, '#F5CC50');
  hubGrad.addColorStop(1,   '#5a3a00');
  ctx.beginPath();
  ctx.arc(CX, CY, R_HUB, 0, 2 * Math.PI);
  ctx.strokeStyle = hubGrad;
  ctx.lineWidth   = size * 0.014;
  ctx.stroke();

  // 9. Center hub cap — black circle like reference image
  const capGrad = ctx.createRadialGradient(
    CX - R_HUB * 0.25, CY - R_HUB * 0.25, 0,
    CX, CY, R_HUB
  );
  capGrad.addColorStop(0,   '#2a2a2a');
  capGrad.addColorStop(0.7, '#111111');
  capGrad.addColorStop(1,   '#000000');
  ctx.beginPath();
  ctx.arc(CX, CY, R_HUB, 0, 2 * Math.PI);
  ctx.fillStyle = capGrad;
  ctx.fill();

  // 10. Result number OR spinning dots in hub
  if (isSpinning) {
    // Animated look: just show "..." while spinning
    ctx.font = `bold ${Math.round(size * 0.055)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('···', CX, CY);
  } else if (displayNumber !== null && displayNumber !== undefined) {
    const numStr = String(displayNumber);
    const fontSize = numStr.length > 1 ? size * 0.095 : size * 0.105;
    ctx.font = `900 ${Math.round(fontSize)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Glow
    ctx.shadowColor = displayNumber === 0 ? '#22c55e' : REDS.has(displayNumber) ? '#ef4444' : '#ffffff';
    ctx.shadowBlur  = size * 0.03;
    ctx.fillStyle   = '#ffffff';
    ctx.fillText(numStr, CX, CY);
    ctx.shadowBlur  = 0;
  }

  // 11. Hub inner gold ring
  ctx.beginPath();
  ctx.arc(CX, CY, R_HUBINNER, 0, 2 * Math.PI);
  ctx.strokeStyle = '#F5CC50';
  ctx.lineWidth   = size * 0.005;
  ctx.stroke();

  // 12. Light bulbs on outer border (stationary)
  const BULBS = 26;
  for (let i = 0; i < BULBS; i++) {
    const a  = i * (2 * Math.PI / BULBS);
    const bx = CX + Math.cos(a) * (R_BORDER * 0.948);
    const by = CY + Math.sin(a) * (R_BORDER * 0.948);
    const on = i % 2 === 0;
    ctx.beginPath();
    ctx.arc(bx, by, size * 0.017, 0, 2 * Math.PI);
    ctx.fillStyle   = on ? '#FFF176' : '#6b5200';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur  = on ? size * 0.024 : 0;
    ctx.fill();
    ctx.shadowBlur  = 0;
    // Gleam
    ctx.beginPath();
    ctx.arc(bx - size * 0.004, by - size * 0.005, size * 0.006, 0, 2 * Math.PI);
    ctx.fillStyle = on ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.1)';
    ctx.fill();
  }

  // 13. Gold pointer at 12 o'clock (always on top)
  const pTip  = CY - R_OUTER + size * 0.006;
  const pBase = CY - R_BORDER + size * 0.004;
  const pW    = size * 0.024;
  ctx.beginPath();
  ctx.moveTo(CX, pTip);
  ctx.lineTo(CX - pW, pBase);
  ctx.lineTo(CX + pW, pBase);
  ctx.closePath();
  const pGrad = ctx.createLinearGradient(CX - pW, 0, CX + pW, 0);
  pGrad.addColorStop(0,   '#7a5200');
  pGrad.addColorStop(0.5, '#F5CC50');
  pGrad.addColorStop(1,   '#7a5200');
  ctx.fillStyle   = pGrad;
  ctx.fill();
  ctx.strokeStyle = '#3a2000';
  ctx.lineWidth   = 1;
  ctx.stroke();
}

export default function WheelEngine({ winningNumber, onSpinComplete }) {
  const canvasRef    = useRef(null);
  const angleRef     = useRef(0);
  const rafRef       = useRef(null);
  const sizeRef      = useRef(480);
  const spinningRef  = useRef(false);
  const displayRef   = useRef(null);   // what shows in the hub
  const [size, setSize] = useState(480);

  // Responsive sizing
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      const s = Math.min(Math.max(w, 260), 560);
      sizeRef.current = s;
      setSize(s);
    });
    if (canvasRef.current?.parentElement) obs.observe(canvasRef.current.parentElement);
    return () => obs.disconnect();
  }, []);

  // Redraw on size change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width        = size * dpr;
    canvas.height       = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    drawWheel(ctx, angleRef.current, size, displayRef.current, spinningRef.current);
  }, [size]);

  // Spin when winningNumber arrives
  useEffect(() => {
    if (winningNumber === null || winningNumber === undefined) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const idx = WHEEL_NUMBERS.indexOf(Number(winningNumber));
    if (idx === -1) return;

    spinningRef.current = true;
    displayRef.current  = null;

    const targetAngle = idx * SEG + SEG / 2;
    const offset      = (2 * Math.PI - targetAngle) % (2 * Math.PI);
    const totalSpin   = 8 * 2 * Math.PI + offset;
    const startAngle  = angleRef.current;
    const endAngle    = startAngle + totalSpin;
    const duration    = 7000;
    let   startTime   = null;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    function tick(ts) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const t       = Math.min(elapsed / duration, 1);
      const current = startAngle + (endAngle - startAngle) * easeOut(t);
      angleRef.current = current;

      const s   = sizeRef.current;
      const dpr = window.devicePixelRatio || 1;
      canvas.width        = s * dpr;
      canvas.height       = s * dpr;
      canvas.style.width  = `${s}px`;
      canvas.style.height = `${s}px`;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawWheel(ctx, current, s, null, true);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        angleRef.current    = endAngle % (2 * Math.PI);
        spinningRef.current = false;
        displayRef.current  = Number(winningNumber);
        // Final draw with number in hub
        canvas.width        = s * dpr;
        canvas.height       = s * dpr;
        canvas.style.width  = `${s}px`;
        canvas.style.height = `${s}px`;
        const ctx2 = canvas.getContext('2d');
        ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawWheel(ctx2, angleRef.current, s, displayRef.current, false);
        if (onSpinComplete) onSpinComplete();
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [winningNumber]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', borderRadius: '50%' }}
    />
  );
}
