import React, { useEffect, useRef, useState } from 'react';

// ── Wheel config ──────────────────────────────────────────────────────────────
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
  return REDS.has(n) ? '#991b1b' : '#111111';
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 4);
}

// ── Core draw function ────────────────────────────────────────────────────────
function drawWheel(ctx, rotation, size) {
  const CX = size / 2, CY = size / 2;

  const R_BORDER   = size * 0.494;
  const R_OUTER    = size * 0.455;
  const R_INNER    = size * 0.300;
  const R_WOODDISC = size * 0.295;
  const R_DIAMOND  = size * 0.270;
  const R_CONE     = size * 0.255;
  const R_HUB      = size * 0.105;
  const R_HUBINNER = size * 0.065;

  ctx.clearRect(0, 0, size, size);

  // 1. Outer gold border
  const goldGrad = ctx.createLinearGradient(CX - R_BORDER, CY, CX + R_BORDER, CY);
  goldGrad.addColorStop(0,    '#7a5200');
  goldGrad.addColorStop(0.25, '#F5CC50');
  goldGrad.addColorStop(0.5,  '#C9960C');
  goldGrad.addColorStop(0.75, '#F5CC50');
  goldGrad.addColorStop(1,    '#7a5200');
  ctx.beginPath();
  ctx.arc(CX, CY, R_BORDER, 0, 2 * Math.PI);
  ctx.fillStyle = goldGrad;
  ctx.fill();

  // 2. Dark rim
  ctx.beginPath();
  ctx.arc(CX, CY, R_BORDER * 0.952, 0, 2 * Math.PI);
  ctx.fillStyle = '#1a1000';
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

    ctx.strokeStyle = 'rgba(201,150,12,0.5)';
    ctx.lineWidth   = 0.7;
    ctx.stroke();

    // Number label
    const midA = startA + SEG / 2;
    const tx = CX + Math.cos(midA) * ((R_OUTER + R_INNER) / 2);
    const ty = CY + Math.sin(midA) * ((R_OUTER + R_INNER) / 2);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(midA + Math.PI / 2);
    ctx.font = `bold ${size * 0.028}px 'DM Mono', monospace`;
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
  innerGold.addColorStop(0,    '#7a5200');
  innerGold.addColorStop(0.4,  '#F5CC50');
  innerGold.addColorStop(0.6,  '#C9960C');
  innerGold.addColorStop(1,    '#7a5200');
  ctx.beginPath();
  ctx.arc(CX, CY, R_INNER, 0, 2 * Math.PI);
  ctx.strokeStyle = innerGold;
  ctx.lineWidth   = size * 0.014;
  ctx.stroke();

  // 5. Wood-tone inner disc
  const woodGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, R_WOODDISC);
  woodGrad.addColorStop(0,   '#d4a96a');
  woodGrad.addColorStop(0.5, '#c49050');
  woodGrad.addColorStop(1,   '#a07030');
  ctx.beginPath();
  ctx.arc(CX, CY, R_WOODDISC, 0, 2 * Math.PI);
  ctx.fillStyle = woodGrad;
  ctx.fill();

  // 6. Cone sectors A–F (rotating)
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
    ctx.strokeStyle = 'rgba(100,60,0,0.45)';
    ctx.lineWidth   = 0.5;
    ctx.stroke();

    const midA = a1 + Math.PI / 6;
    const lx = CX + Math.cos(midA) * R_CONE * 0.62;
    const ly = CY + Math.sin(midA) * R_CONE * 0.62;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(midA + Math.PI / 2);
    ctx.font = `900 ${size * 0.048}px 'Barlow Condensed', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(50,28,0,0.85)';
    ctx.fillText(SECTOR_LABELS[i], 0, 0);
    ctx.restore();
  }

  // 7. Hub outer gold ring
  const hubGrad = ctx.createLinearGradient(CX - R_HUB, CY, CX + R_HUB, CY);
  hubGrad.addColorStop(0,   '#7a5200');
  hubGrad.addColorStop(0.5, '#F5CC50');
  hubGrad.addColorStop(1,   '#7a5200');
  ctx.beginPath();
  ctx.arc(CX, CY, R_HUB, 0, 2 * Math.PI);
  ctx.strokeStyle = hubGrad;
  ctx.lineWidth   = size * 0.012;
  ctx.stroke();

  // 8. Center hub cap
  const capGrad = ctx.createRadialGradient(
    CX - R_HUB * 0.3, CY - R_HUB * 0.3, 0,
    CX, CY, R_HUB
  );
  capGrad.addColorStop(0,   '#9b1c1c');
  capGrad.addColorStop(0.6, '#7f1d1d');
  capGrad.addColorStop(1,   '#3a0000');
  ctx.beginPath();
  ctx.arc(CX, CY, R_HUB, 0, 2 * Math.PI);
  ctx.fillStyle = capGrad;
  ctx.fill();

  // Hub inner gold
  ctx.beginPath();
  ctx.arc(CX, CY, R_HUBINNER, 0, 2 * Math.PI);
  ctx.strokeStyle = '#F5CC50';
  ctx.lineWidth   = size * 0.006;
  ctx.stroke();

  // 9. Diamond separators on cone ring
  for (let i = 0; i < N; i++) {
    const a  = rotation + i * SEG - Math.PI / 2;
    const dx = CX + Math.cos(a) * R_DIAMOND;
    const dy = CY + Math.sin(a) * R_DIAMOND;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(a + Math.PI / 4);
    ctx.beginPath();
    const d = size * 0.009;
    ctx.rect(-d, -d, d * 2, d * 2);
    ctx.fillStyle = '#C9960C';
    ctx.fill();
    ctx.restore();
  }

  // 10. Light bulbs on outer border
  const BULBS = 26;
  for (let i = 0; i < BULBS; i++) {
    const a  = i * (2 * Math.PI / BULBS);
    const bx = CX + Math.cos(a) * (R_BORDER * 0.952);
    const by = CY + Math.sin(a) * (R_BORDER * 0.952);
    const on = i % 2 === 0;

    ctx.beginPath();
    ctx.arc(bx, by, size * 0.016, 0, 2 * Math.PI);
    ctx.fillStyle   = on ? '#FFF176' : '#6b5200';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur  = on ? size * 0.022 : 0;
    ctx.fill();
    ctx.shadowBlur  = 0;

    // Gleam
    ctx.beginPath();
    ctx.arc(bx - size * 0.004, by - size * 0.004, size * 0.006, 0, 2 * Math.PI);
    ctx.fillStyle = on ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.12)';
    ctx.fill();
  }

  // 11. Pointer — always at top, drawn last so it's on top
  const pTip  = CY - R_OUTER + size * 0.008;
  const pBase = CY - R_BORDER + size * 0.002;
  const pW    = size * 0.022;
  ctx.beginPath();
  ctx.moveTo(CX, pTip);
  ctx.lineTo(CX - pW, pBase);
  ctx.lineTo(CX + pW, pBase);
  ctx.closePath();
  const pGold = ctx.createLinearGradient(CX - pW, 0, CX + pW, 0);
  pGold.addColorStop(0,   '#8B6410');
  pGold.addColorStop(0.5, '#F5CC50');
  pGold.addColorStop(1,   '#8B6410');
  ctx.fillStyle   = pGold;
  ctx.fill();
  ctx.strokeStyle = '#3a2800';
  ctx.lineWidth   = 1;
  ctx.stroke();
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WheelEngine({ winningNumber, onSpinComplete }) {
  const canvasRef = useRef(null);
  const angleRef  = useRef(0);
  const rafRef    = useRef(null);
  const sizeRef   = useRef(460);
  const [size, setSize] = useState(460);

  // Resize observer
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      const s = Math.min(Math.max(w, 260), 520);
      sizeRef.current = s;
      setSize(s);
    });
    if (canvasRef.current?.parentElement) {
      obs.observe(canvasRef.current.parentElement);
    }
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
    drawWheel(ctx, angleRef.current, size);
  }, [size]);

  // Spin when winningNumber arrives
  useEffect(() => {
    if (winningNumber === null || winningNumber === undefined) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const idx = WHEEL_NUMBERS.indexOf(Number(winningNumber));
    if (idx === -1) return;

    // How far the target segment's centre is from 12-o-clock
    const targetAngle  = idx * SEG + SEG / 2;
    const offset       = (2 * Math.PI - targetAngle) % (2 * Math.PI);
    const totalSpin    = 8 * 2 * Math.PI + offset;
    const startAngle   = angleRef.current;
    const endAngle     = startAngle + totalSpin;
    const duration     = 7000;
    let   startTime    = null;

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
      drawWheel(ctx, current, s);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        angleRef.current = endAngle % (2 * Math.PI);
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
