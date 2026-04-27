import React, { useEffect, useRef, useState } from 'react';

const POINTER_ASSET = 'https://retail.mb.directgames.bet/Content/images/rspin/pointer.png';
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11,
  30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
  29, 7, 28, 12, 35, 3, 26,
];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const SEG = (2 * Math.PI) / WHEEL_NUMBERS.length;

const INNER_SECTORS = [
  { fill: '#694d1b', text: '',  size: 9.73  },
  { fill: '#a47338', text: 'A', size: 58.37 },
  { fill: '#edc566', text: 'B', size: 58.38 },
  { fill: '#a47338', text: 'C', size: 58.38 },
  { fill: '#edc566', text: 'D', size: 58.38 },
  { fill: '#a47338', text: 'E', size: 58.38 },
  { fill: '#edc566', text: 'F', size: 58.38 },
];

function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

function getPocketColor(num) {
  if (num === 0) return '#1d952d';
  return REDS.has(num) ? '#8c1117' : '#1d1c1a';
}

function getIndicatedNumber(rotation) {
  const norm = ((2 * Math.PI) - (rotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
  const idx  = Math.floor(norm / SEG) % WHEEL_NUMBERS.length;
  return WHEEL_NUMBERS[idx];
}

function rotationForNumber(num) {
  const idx = WHEEL_NUMBERS.indexOf(Number(num));
  if (idx === -1) return 0;
  const mid = idx * SEG + SEG / 2;
  return (2 * Math.PI - mid + 2 * Math.PI * 100) % (2 * Math.PI);
}

// ── Draw Function ───────────────────────────────────────────────────────────
function drawWheel(ctx, rotation, size, displayNumber, isSpinning) {
  const C  = size / 2;
  const OR = size / 2;
  const IR = OR * 0.56;
  const HR = OR * 0.17;
  const pinR = Math.max(3, size * 0.01);

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(C, C);

  // 1. Number segments
  for (let i = 0; i < WHEEL_NUMBERS.length; i++) {
    const sa  = rotation + i * SEG - Math.PI / 2;
    const ea  = sa + SEG;
    const num = WHEEL_NUMBERS[i];

    ctx.beginPath();
    ctx.arc(0, 0, OR, sa, ea);
    ctx.arc(0, 0, IR, ea, sa, true);
    ctx.closePath();
    ctx.fillStyle = getPocketColor(num);
    ctx.fill();
    
    ctx.strokeStyle = '#edc566';
    ctx.lineWidth   = Math.max(1, size * 0.0038);
    ctx.stroke();

    // Text
    const midA  = sa + SEG / 2;
    const textR = OR - Math.max(8, size * 0.042);
    ctx.save();
    ctx.rotate(midA + Math.PI / 2);
    ctx.translate(0, -textR);
    ctx.fillStyle    = '#ffffff';
    ctx.font         = `700 ${Math.round(size * 0.044)}px "Roboto Condensed", sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), 0, 0);
    ctx.restore();
  }

  // 2. Pins
  for (let i = 0; i < WHEEL_NUMBERS.length; i++) {
    const a  = rotation + i * SEG - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * OR, Math.sin(a) * OR, pinR, 0, 2 * Math.PI);
    ctx.fillStyle = '#edc566';
    ctx.fill();
  }

  // 3. Inner sectors
  let curAngle = rotation - Math.PI / 2;
  INNER_SECTORS.forEach((sector, idx) => {
    const arc      = (sector.size * Math.PI) / 180;
    const endAngle = curAngle + arc;
    ctx.beginPath();
    ctx.arc(0, 0, IR, curAngle, endAngle);
    ctx.arc(0, 0, HR, endAngle, curAngle, true);
    ctx.closePath();
    ctx.fillStyle   = sector.fill;
    ctx.fill();
    ctx.strokeStyle = '#edc566';
    ctx.lineWidth   = Math.max(2, size * 0.008);
    ctx.stroke();
    
    if (sector.text) {
      const midA  = curAngle + arc / 2;
      const textR = (IR + HR) / 2;
      ctx.save();
      ctx.translate(Math.cos(midA) * textR, Math.sin(midA) * textR);
      ctx.rotate(midA + Math.PI / 2);
      ctx.fillStyle    = '#ffffff';
      ctx.font         = `800 ${Math.round(size * 0.044)}px sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sector.text, 0, 0);
      ctx.restore();
    }
    curAngle = endAngle;
    if (idx === 0) curAngle += (0.01 * Math.PI) / 180;
  });

  // 4. Hub
  const shownNum  = isSpinning ? getIndicatedNumber(rotation) : displayNumber;
  const hubColor  = (shownNum === null) ? '#8c1117' : getPocketColor(Number(shownNum));
  ctx.beginPath();
  ctx.arc(0, 0, HR * 0.92, 0, 2 * Math.PI);
  ctx.fillStyle = hubColor;
  ctx.fill();

  if (shownNum !== null) {
    ctx.fillStyle    = '#ffffff';
    ctx.font         = `900 ${Math.round(size * 0.1)}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(shownNum), 0, 0);
  }

  ctx.restore();
}

export default function ReferenceWheel({ winningNumber, spinKey, onSpinComplete }) {
  const wrapperRef = useRef(null);
  const canvasRef  = useRef(null);
  const sizeRef    = useRef(720);

  const stateRef = useRef({
    angle:      0,
    spinning:   false,
    displayNum: null,
    spinFrom:   0,
    spinTo:     0,
    spinStart:  null,
    spinDur:    20000,
    pendingKey: null,
  });

  const [size, setSize] = useState(720);
  const [isSpinning, setIsSpinning] = useState(false);
  const [pointerDur, setPointerDur] = useState('0.6s');

  // Resize Observer
  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return;
      const next = Math.max(320, Math.min(wrapperRef.current.clientWidth, 860));
      sizeRef.current = next;
      setSize(next);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Animation Loop
  useEffect(() => {
    let rafId;
    const loop = (ts) => {
      const st = stateRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;

      if (st.spinning && st.spinStart !== null) {
        const progress = Math.min((ts - st.spinStart) / st.spinDur, 1);
        st.angle = st.spinFrom + (st.spinTo - st.spinFrom) * easeOut(progress);

        if (progress >= 1) {
          st.angle = st.spinTo % (2 * Math.PI);
          st.spinning = false;
          st.displayNum = Number(winningNumber);
          setIsSpinning(false);
          if (onSpinComplete) onSpinComplete();
        }
      }

      canvas.width = sizeRef.current * dpr;
      canvas.height = sizeRef.current * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawWheel(ctx, st.angle, sizeRef.current, st.displayNum, st.spinning);
      
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [winningNumber, onSpinComplete]);

  // Logic Trigger
  useEffect(() => {
    const st = stateRef.current;

    // Reset
    if (!spinKey && winningNumber === null) {
      st.pendingKey = null;
      st.displayNum = null;
      st.spinning = false;
      st.angle = 0;
      setIsSpinning(false);
      return;
    }

    // New Spin (Live Result)
    if (spinKey && st.pendingKey !== spinKey && winningNumber !== null) {
      const idx = WHEEL_NUMBERS.indexOf(Number(winningNumber));
      if (idx !== -1) {
        st.pendingKey = spinKey;
        st.displayNum = null;
        st.spinning = true;
        st.spinFrom = st.angle;
        const targetAngle = idx * SEG + SEG / 2;
        const offset = (2 * Math.PI - targetAngle) % (2 * Math.PI);
        st.spinTo = st.angle + (8 * 2 * Math.PI) + offset;
        st.spinStart = performance.now();
        setIsSpinning(true);
      }
    } 
    // Static Load (Page refresh)
    else if (!st.spinning && !spinKey && winningNumber !== null) {
      st.angle = rotationForNumber(winningNumber);
      st.displayNum = Number(winningNumber);
    }
  }, [spinKey, winningNumber]);

  return (
    <div className="reference-wheel" ref={wrapperRef} style={{ position: 'relative', width: '100%', maxWidth: '860px', aspectRatio: '1/1' }}>
      <img 
        src={POINTER_ASSET} 
        className={`pointer ${isSpinning ? 'anim' : ''}`} 
        style={{
          position: 'absolute', top: '2%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, width: '8%', animationDuration: pointerDur
        }}
      />
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(-50%) rotate(0deg); }
          50% { transform: translateX(-50%) rotate(10deg); }
        }
        .pointer.anim { animation: shake 0.2s infinite; }
      `}</style>
    </div>
  );
}
