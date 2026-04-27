import React, { useEffect, useRef, useState } from 'react';

const POINTER_ASSET = 'https://retail.mb.directgames.bet/Content/images/rspin/pointer.png';
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11,
  30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
  29, 7, 28, 12, 35, 3, 26,
];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const OUTER_SEGMENT_ANGLE = (2 * Math.PI) / WHEEL_NUMBERS.length;
const INNER_SECTORS = [
  { fill: '#694d1b', text: '', size: 9.73 },
  { fill: '#a47338', text: 'A', size: 58.37 },
  { fill: '#edc566', text: 'B', size: 58.38 },
  { fill: '#a47338', text: 'C', size: 58.38 },
  { fill: '#edc566', text: 'D', size: 58.38 },
  { fill: '#a47338', text: 'E', size: 58.38 },
  { fill: '#edc566', text: 'F', size: 58.38 },
];

function easeOut(t) {
  return 1 - Math.pow(1 - t, 4);
}

function getPocketColor(num) {
  if (num === 0) return '#1d952d';
  return REDS.has(num) ? '#8c1117' : '#1d1c1a';
}

function getIndicatedNumber(rotation) {
  const normalizedRotation = ((2 * Math.PI) - (rotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
  const index = Math.floor(normalizedRotation / OUTER_SEGMENT_ANGLE) % WHEEL_NUMBERS.length;
  return WHEEL_NUMBERS[index];
}

function drawReferenceWheel(ctx, rotation, size, displayNumber, isSpinning) {
  const center = size / 2;
  const outerRadius = size / 2;
  const innerRadius = outerRadius * 0.56;
  const innerOuterRadius = innerRadius;
  const innerInnerRadius = outerRadius * 0.17;
  const pinRadius = Math.max(3, size * 0.01);

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(center, center);

  for (let i = 0; i < WHEEL_NUMBERS.length; i += 1) {
    const startA = rotation + i * OUTER_SEGMENT_ANGLE - Math.PI / 2;
    const endA = startA + OUTER_SEGMENT_ANGLE;
    const num = WHEEL_NUMBERS[i];

    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, startA, endA);
    ctx.arc(0, 0, innerRadius, endA, startA, true);
    ctx.closePath();
    ctx.fillStyle = getPocketColor(num);
    if (num !== 0) {
      ctx.shadowColor = REDS.has(num) ? 'rgba(140, 17, 23, 0.82)' : 'rgba(0, 0, 0, 0.78)';
      ctx.shadowBlur = Math.max(16, size * 0.04);
      ctx.shadowOffsetY = Math.max(4, size * 0.008);
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#edc566';
    ctx.lineWidth = Math.max(1, size * 0.0038);
    ctx.stroke();

    const midA = startA + (OUTER_SEGMENT_ANGLE / 2);
    const textRadius = outerRadius - Math.max(8, size * 0.042);

    ctx.save();
    ctx.rotate(midA + Math.PI / 2);
    ctx.translate(0, -textRadius);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(size * 0.044)}px "Roboto Condensed", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = Math.max(8, size * 0.02);
    ctx.shadowOffsetY = Math.max(2, size * 0.004);
    ctx.fillText(String(num), 0, 0);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.restore();
  }

  for (let i = 0; i < 37; i += 1) {
    const angle = rotation + i * OUTER_SEGMENT_ANGLE - Math.PI / 2;
    const px = Math.cos(angle) * outerRadius;
    const py = Math.sin(angle) * outerRadius;
    ctx.beginPath();
    ctx.arc(px, py, pinRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#edc566';
    ctx.fill();
  }

  let currentAngle = rotation - Math.PI / 2;
  INNER_SECTORS.forEach((sector, index) => {
    const arc = (sector.size * Math.PI) / 180;
    const endAngle = currentAngle + arc;

    ctx.beginPath();
    ctx.arc(0, 0, innerOuterRadius, currentAngle, endAngle);
    ctx.arc(0, 0, innerInnerRadius, endAngle, currentAngle, true);
    ctx.closePath();
    ctx.fillStyle = sector.fill;
    ctx.fill();
    ctx.strokeStyle = '#edc566';
    ctx.lineWidth = Math.max(2, size * 0.008);
    ctx.stroke();

    if (sector.text) {
      const midAngle = currentAngle + (arc / 2);
      const textRadius = (innerOuterRadius + innerInnerRadius) / 2;
      const tx = Math.cos(midAngle) * textRadius;
      const ty = Math.sin(midAngle) * textRadius;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.round(size * 0.044)}px "Roboto Condensed", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sector.text, 0, 0);
      ctx.restore();
    }

    currentAngle = endAngle;
    if (index === 0) currentAngle += (0.01 * Math.PI) / 180;
  });

  const currentCenterNumber = isSpinning ? getIndicatedNumber(rotation) : displayNumber;
  const centerPocketColor = currentCenterNumber === null || currentCenterNumber === undefined
    ? '#8c1117'
    : getPocketColor(Number(currentCenterNumber));
  const hubGradient = ctx.createRadialGradient(-innerInnerRadius * 0.35, -innerInnerRadius * 0.35, 0, 0, 0, innerInnerRadius);
  hubGradient.addColorStop(0, centerPocketColor);
  hubGradient.addColorStop(1, '#000000');
  ctx.beginPath();
  ctx.arc(0, 0, innerInnerRadius * 0.92, 0, 2 * Math.PI);
  ctx.fillStyle = hubGradient;
  ctx.fill();

  if (isSpinning) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(size * 0.1)}px "Roboto Condensed", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = Math.max(10, size * 0.028);
    ctx.shadowOffsetY = Math.max(2, size * 0.004);
    ctx.fillText(String(currentCenterNumber), 0, 0);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  } else if (displayNumber !== null && displayNumber !== undefined) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(size * 0.1)}px "Roboto Condensed", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = Math.max(10, size * 0.028);
    ctx.shadowOffsetY = Math.max(2, size * 0.004);
    ctx.fillText(String(displayNumber), 0, 0);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  ctx.restore();
}

export default function ReferenceWheel({ winningNumber, spinKey, onSpinComplete }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const angleRef = useRef(0);
  const renderRafRef = useRef(null);
  const spinRafRef = useRef(null);
  const lastSpinKeyRef = useRef(null);
  const lastResultRef = useRef(null);
  const spinningRef = useRef(false);
  const [size, setSize] = useState(720);
  const [pointerDuration, setPointerDuration] = useState('0.6s');
  const [dotDuration, setDotDuration] = useState('2.5s');
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    const updateSize = () => {
      const node = wrapperRef.current;
      if (!node) return;
      const next = Math.max(320, Math.min(Math.floor(node.clientWidth), 860));
      setSize(next);
    };

    updateSize();
    const node = wrapperRef.current;
    const observer = typeof ResizeObserver !== 'undefined' && node
      ? new ResizeObserver(() => updateSize())
      : null;

    if (observer && node) observer.observe(node);
    window.addEventListener('resize', updateSize);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawReferenceWheel(ctx, angleRef.current, size, lastResultRef.current, spinningRef.current);
      renderRafRef.current = requestAnimationFrame(render);
    };

    renderRafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(renderRafRef.current);
  }, [size]);

  useEffect(() => {
    if (!isSpinning) {
      setPointerDuration('0.6s');
      setDotDuration('2.5s');
      return undefined;
    }

    const timers = [
      setTimeout(() => setPointerDuration('0.6s'), 0),
      setTimeout(() => setDotDuration('2.7s'), 2000),
      setTimeout(() => setDotDuration('3s'), 4000),
      setTimeout(() => setDotDuration('3.5s'), 6000),
      setTimeout(() => setDotDuration('5s'), 8000),
      setTimeout(() => setDotDuration('7s'), 14000),
      setTimeout(() => setDotDuration('8s'), 16000),
      setTimeout(() => setPointerDuration('2s'), 16500),
      setTimeout(() => setPointerDuration('3s'), 18000),
      setTimeout(() => setPointerDuration('4s'), 19000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [isSpinning]);

  useEffect(() => {
    if (!spinKey) {
      lastSpinKeyRef.current = null;
      lastResultRef.current = null;
      spinningRef.current = false;
      setIsSpinning(false);
      return;
    }

    if (winningNumber === null || winningNumber === undefined) return;
    if (spinningRef.current) return;
    if (lastSpinKeyRef.current === spinKey) return;

    const idx = WHEEL_NUMBERS.indexOf(Number(winningNumber));
    if (idx === -1) return;

    spinningRef.current = true;
    setIsSpinning(true);
    lastSpinKeyRef.current = spinKey;
    lastResultRef.current = null;

    const targetAngle = (idx * OUTER_SEGMENT_ANGLE) + (OUTER_SEGMENT_ANGLE / 2);
    const offset = (2 * Math.PI - targetAngle) % (2 * Math.PI);
    const totalSpin = (Math.PI * 16) + offset;
    const startAngle = angleRef.current;
    const startTime = performance.now();
    const duration = 20000;

    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      angleRef.current = startAngle + (totalSpin * easeOut(progress));

      if (progress < 1) {
        spinRafRef.current = requestAnimationFrame(animate);
        return;
      }

      angleRef.current %= (2 * Math.PI);
      spinningRef.current = false;
      setIsSpinning(false);
      lastResultRef.current = winningNumber;
      if (onSpinComplete) onSpinComplete();
    };

    spinRafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(spinRafRef.current);
  }, [winningNumber, spinKey, onSpinComplete]);

  return (
    <div className="reference-wheel" ref={wrapperRef}>
      <img
        src={POINTER_ASSET}
        alt=""
        aria-hidden="true"
        className={`reference-wheel__pointer ${isSpinning ? 'reference-wheel__pointer--animating' : ''}`}
        style={{ animationDuration: pointerDuration }}
      />
      <div className="reference-wheel__outer-frame">
        <div className="reference-wheel__outer-frame-core" />
      </div>
      <div
        className="reference-wheel__ring"
      >
        <div
          className={`reference-wheel__dot-orbit ${isSpinning ? 'reference-wheel__dot-orbit--animating' : ''}`}
          style={{ animationDuration: dotDuration }}
        >
          {Array.from({ length: 25 }).map((_, i) => (
            <span
              key={i}
              className="reference-wheel__dot"
              style={{
                left: `calc(50% + ${Math.cos((i / 25) * Math.PI * 2) * 49}%)`,
                top: `calc(50% + ${Math.sin((i / 25) * Math.PI * 2) * 49}%)`,
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
          width: 94vmin;
          height: 94vmin;
          max-width: 960px;
          max-height: 960px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .reference-wheel__pointer {
          position: absolute;
          top: 22px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 40;
          width: 31px;
          height: 48px;
          object-fit: contain;
          filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.8));
          transform-origin: 50% 0%;
        }

        .reference-wheel__pointer--animating {
          animation: pointerShake 0.3s infinite ease-in-out;
        }

        .reference-wheel__ring {
          position: relative;
          width: 85vmin;
          height: 85vmin;
          max-width: 880px;
          max-height: 880px;
          border-radius: 9999px;
          border: 7px solid #ffe837;
          background: #000;
          box-shadow:
            0 0 20px #cc981e,
            0 10px 18px rgba(0, 0, 0, 0.34),
            inset 0 0 22px rgba(255, 215, 0, 0.35),
            inset 0 -10px 18px rgba(0, 0, 0, 0.28),
            inset 0 0 55px rgba(255, 215, 0, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .reference-wheel__outer-frame {
          position: absolute;
          width: 91vmin;
          height: 91vmin;
          max-width: 940px;
          max-height: 940px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(110deg, #edc566, #a47338 45%, #694d1b 45%, #edc566 100%);
          filter: drop-shadow(0 0 10px #000) drop-shadow(0 0 10px #000);
          box-shadow:
            0 10px 18px rgba(0, 0, 0, 0.32),
            inset 0 0 10px rgba(255, 240, 180, 0.18);
          z-index: 0;
        }

        .reference-wheel__outer-frame-core {
          width: 92%;
          height: 92%;
          border-radius: 9999px;
          background: rgba(0, 0, 0, 0.92);
          box-shadow: inset 0 0 18px rgba(255, 215, 0, 0.18);
        }

        .reference-wheel__dot-orbit {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .reference-wheel__dot-orbit--animating {
          animation: rotateDots 2.5s linear infinite;
          transform-origin: center center;
        }

        .reference-wheel__dot-orbit--animating .reference-wheel__dot {
          animation: none;
          opacity: 1;
        }

        .reference-wheel__dot {
          position: absolute;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background-color: #fff8b7;
          box-shadow:
            inset 0 0 1px 3px hsla(0, 0%, 100%, 0),
            0 0 11px 7px rgba(255, 250, 158, 0.95),
            0 0 8px 11px rgba(253, 255, 212, 0.95),
            0 0 1px 2px #000;
          animation: orbitBlink 2s infinite alternate;
        }

        .reference-wheel__outer-border {
          position: relative;
          width: 97%;
          height: 97%;
          border-radius: 9999px;
          border: 3px solid #edc566;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow:
            inset 0 3px 6px rgba(0, 0, 0, 0.16),
            inset 0 -6px 10px rgba(0, 0, 0, 0.2),
            0 4px 6px rgba(0, 0, 0, 0.45);
        }

        .reference-wheel__canvas {
          width: 100%;
          height: 100%;
          display: block;
          border-radius: 9999px;
        }

        .reference-wheel__center-frame {
          position: absolute;
          width: 88%;
          height: 88%;
          border-radius: 9999px;
          border: 4px solid #edc566;
          box-shadow:
            inset 0 3px 6px rgba(0, 0, 0, 0.16),
            inset 0 -6px 10px rgba(0, 0, 0, 0.2),
            0 3px 3px rgba(0, 0, 0, 0.45);
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .reference-wheel__center-shell {
          width: 24%;
          height: 24%;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(110deg, #edc566, #a47338 45%, #694d1b 45%, #edc566 100%);
          filter: drop-shadow(0 0 10px #000) drop-shadow(0 0 10px #000);
          box-shadow:
            inset 0 -6px 10px rgba(0, 0, 0, 0.2),
            0 4px 6px rgba(0, 0, 0, 0.28);
        }

        .reference-wheel__center-core {
          width: 84%;
          height: 84%;
          border-radius: 9999px;
          background: radial-gradient(circle at 100px 100px, #8c1117, #000);
        }

        @keyframes orbitBlink {
          0% {
            opacity: 0.3;
            box-shadow: 0 0 5px rgba(255, 215, 0, 0.4);
          }

          100% {
            opacity: 1;
            box-shadow: 0 0 15px rgba(255, 215, 0, 1);
          }
        }

        @keyframes rotateDots {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pointerShake {
          0% {
            transform: translateX(-50%) rotate(0deg);
          }

          50% {
            transform: translateX(-50%) rotate(5deg);
          }

          100% {
            transform: translateX(-50%) rotate(0deg);
          }
        }

        @media (max-width: 1023px) {
          .reference-wheel {
            width: min(94vw, 94vh);
            height: min(94vw, 94vh);
          }

          .reference-wheel__outer-frame {
            width: min(91vw, 91vh);
            height: min(91vw, 91vh);
          }

          .reference-wheel__ring {
            width: min(85vw, 85vh);
            height: min(85vw, 85vh);
          }

          .reference-wheel__pointer {
            top: 8px;
          }
        }
      `}</style>
    </div>
  );
}
