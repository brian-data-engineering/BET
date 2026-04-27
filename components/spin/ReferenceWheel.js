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

// Exact rotation that puts segment for `num` under the 12-o'clock pointer
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

  // Number segments
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
    ctx.shadowColor  = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur   = Math.max(8, size * 0.02);
    ctx.shadowOffsetY = Math.max(2, size * 0.004);
    ctx.fillText(String(num), 0, 0);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
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

  // Inner cone sectors
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
      ctx.font         = `800 ${Math.round(size * 0.044)}px "Roboto Condensed", sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sector.text, 0, 0);
      ctx.restore();
    }
    curAngle = endAngle;
    if (idx === 0) curAngle += (0.01 * Math.PI) / 180;
  });

  // Hub
  const shownNum  = isSpinning ? getIndicatedNumber(rotation) : displayNumber;
  const hubColor  = (shownNum === null || shownNum === undefined) ? '#8c1117' : getPocketColor(Number(shownNum));
  const hubGrad   = ctx.createRadialGradient(-HR * 0.35, -HR * 0.35, 0, 0, 0, HR);
  hubGrad.addColorStop(0, hubColor);
  hubGrad.addColorStop(1, '#000000');
  ctx.beginPath();
  ctx.arc(0, 0, HR * 0.92, 0, 2 * Math.PI);
  ctx.fillStyle = hubGrad;
  ctx.fill();

  if (shownNum !== null && shownNum !== undefined) {
    ctx.fillStyle    = '#ffffff';
    ctx.font         = `900 ${Math.round(size * 0.1)}px "Roboto Condensed", sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur   = Math.max(10, size * 0.028);
    ctx.shadowOffsetY = Math.max(2, size * 0.004);
    ctx.fillText(String(shownNum), 0, 0);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
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
    rafId:      null,
  });

  const [size,       setSize]       = useState(720);
  const [isSpinning, setIsSpinning] = useState(false);
  const [pointerDur, setPointerDur] = useState('0.6s');
  const [dotDur,     setDotDur]     = useState('2.5s');

  const onSpinCompleteRef = useRef(onSpinComplete);
  useEffect(() => { onSpinCompleteRef.current = onSpinComplete; }, [onSpinComplete]);

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const node = wrapperRef.current;
      if (!node) return;
      const next = Math.max(320, Math.min(Math.floor(node.clientWidth), 860));
      sizeRef.current = next;
      setSize(next);
    };
    update();
    const node = wrapperRef.current;
    const ro   = typeof ResizeObserver !== 'undefined' && node ? new ResizeObserver(update) : null;
    if (ro && node) ro.observe(node);
    window.addEventListener('resize', update);
    return () => { ro?.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  // ── Set canvas backing store on size change only ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width        = size * dpr;
    canvas.height       = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [size]);

  // ── Master RAF loop ───────────────────────────────────────────────────────
 // Change the Master RAF loop useEffect to look like this:
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const loop = (ts) => {
    const st = stateRef.current;
    const s = sizeRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    if (st.spinning && st.spinStart !== null) {
      const progress = Math.min((ts - st.spinStart) / st.spinDur, 1);
      
      // Use the eased progress to move the angle
      st.angle = st.spinFrom + (st.spinTo - st.spinFrom) * easeOut(progress);

      if (progress >= 1) {
        st.angle = st.spinTo % (2 * Math.PI);
        st.spinning = false;
        st.spinStart = null;
        setIsSpinning(false); // Triggers the 'landed' UI state
        if (onSpinCompleteRef.current) onSpinCompleteRef.current();
      }
    }

    // Always clear and redraw, even if static
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWheel(ctx, st.angle, s, st.displayNum, st.spinning);
    st.rafId = requestAnimationFrame(loop);
  };

  st.rafId = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(st.rafId);
}, [size]); // Keep size as the only dependency to avoid loop restarts 

  
  // ── Pointer + dot timing ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isSpinning) { setPointerDur('0.6s'); setDotDur('2.5s'); return; }
    const t = [
      setTimeout(() => setPointerDur('0.6s'),  0),
      setTimeout(() => setDotDur('2.7s'),    2000),
      setTimeout(() => setDotDur('3s'),      4000),
      setTimeout(() => setDotDur('3.5s'),    6000),
      setTimeout(() => setDotDur('5s'),      8000),
      setTimeout(() => setDotDur('7s'),     14000),
      setTimeout(() => setDotDur('8s'),     16000),
      setTimeout(() => setPointerDur('2s'), 16500),
      setTimeout(() => setPointerDur('3s'), 18000),
      setTimeout(() => setPointerDur('4s'), 19000),
    ];
    return () => t.forEach(clearTimeout);
  }, [isSpinning]);

 // ── THE FIX: respond to both spinKey AND winningNumber changes ────────────
  useEffect(() => {
    const st = stateRef.current;

    // 1. New open round or reset — clear everything
    if (!spinKey && (winningNumber === null || winningNumber === undefined)) {
      st.pendingKey = null;
      st.displayNum = null;
      st.spinning = false;
      st.spinStart = null;
      st.angle = 0;
      setIsSpinning(false);
      return;
    }

    // 2. LIVE SPIN TRIGGER (Prioritize this above all)
    if (spinKey && st.pendingKey !== spinKey && winningNumber !== null && winningNumber !== undefined) {
      const idx = WHEEL_NUMBERS.indexOf(Number(winningNumber));
      if (idx !== -1) {
        const targetAngle = idx * SEG + SEG / 2;
        const offset = (2 * Math.PI - targetAngle) % (2 * Math.PI);
        const totalSpin = 8 * 2 * Math.PI + offset;

        st.pendingKey = spinKey;
        st.displayNum = null; // Keep hub empty while spinning
        st.spinning = true;
        st.spinFrom = st.angle;
        st.spinTo = st.angle + totalSpin;
        st.spinStart = performance.now();
        st.spinDur = 20000;

        setIsSpinning(true);
        return; 
      }
    }

    // 3. STATIC POSITIONING & POST-SPIN DISPLAY
    // Snap to position if not spinning, or update the hub number once a spin lands
    if (!st.spinning && winningNumber !== null && winningNumber !== undefined) {
      st.displayNum = Number(winningNumber);
      
      // Only snap the angle if we aren't mid-spin and don't have an active spinKey
      if (!spinKey) {
        st.angle = rotationForNumber(winningNumber);
        st.pendingKey = null;
      }
    }
  }, [spinKey, winningNumber]);
  

  return (
    <div className="reference-wheel" ref={wrapperRef}>
      <img
        src={POINTER_ASSET}
        alt=""
        aria-hidden="true"
        className={`reference-wheel__pointer ${isSpinning ? 'reference-wheel__pointer--animating' : ''}`}
        style={{ animationDuration: pointerDur }}
      />
      <div className="reference-wheel__outer-frame">
        <div className="reference-wheel__outer-frame-core" />
      </div>
      <div className="reference-wheel__ring">
        <div
          className={`reference-wheel__dot-orbit ${isSpinning ? 'reference-wheel__dot-orbit--animating' : ''}`}
          style={{ animationDuration: dotDur }}
        >
          {Array.from({ length: 25 }).map((_, i) => (
            <span
              key={i}
              className="reference-wheel__dot"
              style={{
                left: `calc(50% + ${Math.cos((i / 25) * Math.PI * 2) * 49}%)`,
                top:  `calc(50% + ${Math.sin((i / 25) * Math.PI * 2) * 49}%)`,
              }}
            />
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
        .reference-wheel {
          position: relative;
          width: 94vmin; height: 94vmin;
          max-width: 960px; max-height: 960px;
          display: flex; align-items: center; justify-content: center;
        }
        .reference-wheel__pointer {
          position: absolute; top: 22px; left: 50%;
          transform: translateX(-50%);
          z-index: 40; width: 31px; height: 48px;
          object-fit: contain;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.8));
          transform-origin: 50% 0%;
        }
        .reference-wheel__pointer--animating {
          animation: pointerShake 0.3s infinite ease-in-out;
        }
        .reference-wheel__ring {
          position: relative;
          width: 85vmin; height: 85vmin;
          max-width: 880px; max-height: 880px;
          border-radius: 9999px;
          border: 7px solid #ffe837;
          background: #000;
          box-shadow:
            0 0 20px #cc981e,
            0 10px 18px rgba(0,0,0,0.34),
            inset 0 0 22px rgba(255,215,0,0.35),
            inset 0 -10px 18px rgba(0,0,0,0.28),
            inset 0 0 55px rgba(255,215,0,0.12);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .reference-wheel__outer-frame {
          position: absolute;
          width: 91vmin; height: 91vmin;
          max-width: 940px; max-height: 940px;
          border-radius: 9999px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(110deg, #edc566, #a47338 45%, #694d1b 45%, #edc566 100%);
          filter: drop-shadow(0 0 10px #000) drop-shadow(0 0 10px #000);
          box-shadow: 0 10px 18px rgba(0,0,0,0.32), inset 0 0 10px rgba(255,240,180,0.18);
          z-index: 0;
        }
        .reference-wheel__outer-frame-core {
          width: 92%; height: 92%; border-radius: 9999px;
          background: rgba(0,0,0,0.92);
          box-shadow: inset 0 0 18px rgba(255,215,0,0.18);
        }
        .reference-wheel__dot-orbit {
          position: absolute; inset: 0; pointer-events: none;
        }
        .reference-wheel__dot-orbit--animating {
          animation: rotateDots 2.5s linear infinite;
          transform-origin: center center;
        }
        .reference-wheel__dot-orbit--animating .reference-wheel__dot {
          animation: none; opacity: 1;
        }
        .reference-wheel__dot {
          position: absolute;
          transform: translate(-50%, -50%);
          width: 16px; height: 16px;
          border-radius: 9999px;
          background-color: #fff8b7;
          box-shadow:
            inset 0 0 1px 3px hsla(0,0%,100%,0),
            0 0 11px 7px rgba(255,250,158,0.95),
            0 0 8px 11px rgba(253,255,212,0.95),
            0 0 1px 2px #000;
          animation: orbitBlink 2s infinite alternate;
        }
        .reference-wheel__outer-border {
          position: relative;
          width: 97%; height: 97%;
          border-radius: 9999px;
          border: 3px solid #edc566;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          box-shadow:
            inset 0 3px 6px rgba(0,0,0,0.16),
            inset 0 -6px 10px rgba(0,0,0,0.2),
            0 4px 6px rgba(0,0,0,0.45);
        }
        .reference-wheel__canvas {
          width: 100%; height: 100%;
          display: block; border-radius: 9999px;
        }
        .reference-wheel__center-frame {
          position: absolute;
          width: 88%; height: 88%;
          border-radius: 9999px;
          border: 4px solid #edc566;
          box-shadow:
            inset 0 3px 6px rgba(0,0,0,0.16),
            inset 0 -6px 10px rgba(0,0,0,0.2),
            0 3px 3px rgba(0,0,0,0.45);
          pointer-events: none;
          display: flex; align-items: center; justify-content: center;
        }
        .reference-wheel__center-shell {
          width: 24%; height: 24%;
          border-radius: 9999px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(110deg, #edc566, #a47338 45%, #694d1b 45%, #edc566 100%);
          filter: drop-shadow(0 0 10px #000) drop-shadow(0 0 10px #000);
          box-shadow: inset 0 -6px 10px rgba(0,0,0,0.2), 0 4px 6px rgba(0,0,0,0.28);
        }
        .reference-wheel__center-core {
          width: 84%; height: 84%;
          border-radius: 9999px;
          background: radial-gradient(circle at 100px 100px, #8c1117, #000);
        }
        @keyframes orbitBlink {
          0%   { opacity: 0.3; box-shadow: 0 0 5px rgba(255,215,0,0.4); }
          100% { opacity: 1;   box-shadow: 0 0 15px rgba(255,215,0,1); }
        }
        @keyframes rotateDots {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pointerShake {
          0%   { transform: translateX(-50%) rotate(0deg); }
          50%  { transform: translateX(-50%) rotate(5deg); }
          100% { transform: translateX(-50%) rotate(0deg); }
        }
        @media (max-width: 1023px) {
          .reference-wheel { width: min(94vw,94vh); height: min(94vw,94vh); }
          .reference-wheel__outer-frame { width: min(91vw,91vh); height: min(91vw,91vh); }
          .reference-wheel__ring { width: min(85vw,85vh); height: min(85vw,85vh); }
          .reference-wheel__pointer { top: 8px; }
        }
      `}</style>
    </div>
  );
}
