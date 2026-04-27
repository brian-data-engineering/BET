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

function drawWheel(ctx, rotation, size, displayNumber, isSpinning) {
  const C  = size / 2;
  const OR = size / 2;
  const IR = OR * 0.56;
  const HR = OR * 0.17;
  const pinR = Math.max(3, size * 0.01);

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(C, C);

  for (let i = 0; i < WHEEL_NUMBERS.length; i++) {
    const sa  = rotation + i * SEG - Math.PI / 2;
    const ea  = sa + SEG;
    const num = WHEEL_NUMBERS[i];

    ctx.beginPath();
    ctx.arc(0, 0, OR, sa, ea);
    ctx.arc(0, 0, IR, ea, sa, true);
    ctx.closePath();
    ctx.fillStyle = getPocketColor(num);
    if (num !== 0) {
      ctx.shadowColor   = REDS.has(num) ? 'rgba(140,17,23,0.82)' : 'rgba(0,0,0,0.78)';
      ctx.shadowBlur    = Math.max(16, size * 0.04);
      ctx.shadowOffsetY = Math.max(4, size * 0.008);
    }
    ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#edc566';
    ctx.lineWidth   = Math.max(1, size * 0.0038);
    ctx.stroke();

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

  // Pins
  for (let i = 0; i < WHEEL_NUMBERS.length; i++) {
    const a  = rotation + i * SEG - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * OR, Math.sin(a) * OR, pinR, 0, 2 * Math.PI);
    ctx.fillStyle = '#edc566';
    ctx.fill();
  }

  // Inner sectors
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
    curAngle = endAngle;
    if (idx === 0) curAngle += (0.01 * Math.PI) / 180;
  });

  // Hub
  const shownNum  = isSpinning ? getIndicatedNumber(rotation) : displayNumber;
  const hubColor  = (shownNum === null || shownNum === undefined) ? '#8c1117' : getPocketColor(Number(shownNum));
  ctx.beginPath();
  ctx.arc(0, 0, HR * 0.92, 0, 2 * Math.PI);
  ctx.fillStyle = hubColor;
  ctx.fill();

  if (shownNum !== null && shownNum !== undefined) {
    ctx.fillStyle    = '#ffffff';
    ctx.font         = `900 ${Math.round(size * 0.1)}px "Roboto Condensed", sans-serif`;
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
  const [dotDur, setDotDur] = useState('2.5s');

  const onSpinCompleteRef = useRef(onSpinComplete);
  useEffect(() => { onSpinCompleteRef.current = onSpinComplete; }, [onSpinComplete]);

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

  // Sync Canvas Backing Store
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [size]);

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
          if (onSpinCompleteRef.current) onSpinCompleteRef.current();
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawWheel(ctx, st.angle, sizeRef.current, st.displayNum, st.spinning);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [winningNumber]);

  // Handle Input Changes
  useEffect(() => {
    const st = stateRef.current;

    // Reset logic
    if (!spinKey && (winningNumber === null || winningNumber === undefined)) {
      st.pendingKey = null;
      st.displayNum = null;
      st.spinning = false;
      st.angle = 0;
      setIsSpinning(false);
      return;
    }

    // Trigger Spin
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
        return; 
      }
    }

    // Static display (if not currently spinning)
    if (!st.spinning && winningNumber !== null) {
      st.displayNum = Number(winningNumber);
      if (!spinKey) {
        st.angle = rotationForNumber(winningNumber);
      }
    }
  }, [spinKey, winningNumber]);

  return (
    <div className="reference-wheel" ref={wrapperRef}>
      <img
        src={POINTER_ASSET}
        className={`reference-wheel__pointer ${isSpinning ? 'reference-wheel__pointer--animating' : ''}`}
        style={{ animationDuration: pointerDur }}
      />
      <div className="reference-wheel__outer-frame">
        <div className="reference-wheel__outer-frame-core" />
      </div>
      <div className="reference-wheel__ring">
        <div className={`reference-wheel__dot-orbit ${isSpinning ? 'reference-wheel__dot-orbit--animating' : ''}`} style={{ animationDuration: dotDur }}>
          {Array.from({ length: 25 }).map((_, i) => (
            <span key={i} className="reference-wheel__dot" style={{
              left: `calc(50% + ${Math.cos((i / 25) * Math.PI * 2) * 49}%)`,
              top: `calc(50% + ${Math.sin((i / 25) * Math.PI * 2) * 49}%)`,
            }} />
          ))}
        </div>
        <div className="reference-wheel__outer-border">
          <canvas ref={canvasRef} className="reference-wheel__canvas" />
          <div className="reference-wheel__center-frame">
            <div className="reference-wheel__center-shell">
              <div className="reference-wheel__center-core" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .reference-wheel { position: relative; width: 94vmin; height: 94vmin; max-width: 960px; max-height: 960px; display: flex; align-items: center; justify-content: center; }
        .reference-wheel__pointer { position: absolute; top: 22px; left: 50%; transform: translateX(-50%); z-index: 40; width: 31px; height: 48px; transform-origin: 50% 0%; }
        .reference-wheel__pointer--animating { animation: pointerShake 0.3s infinite ease-in-out; }
        .reference-wheel__ring { position: relative; width: 85vmin; height: 85vmin; border-radius: 9999px; border: 7px solid #ffe837; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .reference-wheel__outer-frame { position: absolute; width: 91vmin; height: 91vmin; border-radius: 9999px; background: linear-gradient(110deg, #edc566, #a47338 45%, #694d1b 45%, #edc566 100%); z-index: 0; }
        .reference-wheel__outer-frame-core { width: 92%; height: 92%; border-radius: 9999px; background: rgba(0,0,0,0.92); }
        .reference-wheel__dot-orbit { position: absolute; inset: 0; }
        .reference-wheel__dot-orbit--animating { animation: rotateDots 2.5s linear infinite; }
        .reference-wheel__dot { position: absolute; transform: translate(-50%, -50%); width: 16px; height: 16px; border-radius: 9999px; background-color: #fff8b7; box-shadow: 0 0 11px 7px rgba(255,250,158,0.95); }
        .reference-wheel__outer-border { position: relative; width: 97%; height: 97%; border-radius: 9999px; border: 3px solid #edc566; display: flex; align-items: center; justify-content: center; }
        .reference-wheel__canvas { width: 100%; height: 100%; display: block; border-radius: 9999px; }
        .reference-wheel__center-frame { position: absolute; width: 88%; height: 88%; border-radius: 9999px; border: 4px solid #edc566; display: flex; align-items: center; justify-content: center; }
        .reference-wheel__center-shell { width: 24%; height: 24%; border-radius: 9999px; background: linear-gradient(110deg, #edc566, #a47338 45%, #694d1b 45%, #edc566 100%); }
        .reference-wheel__center-core { width: 84%; height: 84%; border-radius: 9999px; background: radial-gradient(circle, #8c1117, #000); }
        @keyframes rotateDots { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pointerShake { 0%, 100% { transform: translateX(-50%) rotate(0deg); } 50% { transform: translateX(-50%) rotate(5deg); } }
      `}</style>
    </div>
  );
}
