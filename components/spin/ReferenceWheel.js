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
  { fill: '#8a4f12', text: '', size: 9.73 },
  { fill: '#d97a1d', text: 'A', size: 58.37 },
  { fill: '#f0bf4c', text: 'B', size: 58.38 },
  { fill: '#d97a1d', text: 'C', size: 58.38 },
  { fill: '#f0bf4c', text: 'D', size: 58.38 },
  { fill: '#d97a1d', text: 'E', size: 58.38 },
  { fill: '#f0bf4c', text: 'F', size: 58.38 },
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
  const pointerAlignedRotation = (normalizedRotation - (OUTER_SEGMENT_ANGLE / 2) + (2 * Math.PI)) % (2 * Math.PI);
  const index = Math.floor(pointerAlignedRotation / OUTER_SEGMENT_ANGLE) % WHEEL_NUMBERS.length;
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

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, outerRadius - Math.max(1, size * 0.004), 0, 2 * Math.PI);
  ctx.lineWidth = Math.max(12, size * 0.03);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
  ctx.shadowBlur = Math.max(14, size * 0.034);
  ctx.stroke();
  ctx.restore();

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
      const textRadius = ((innerOuterRadius + innerInnerRadius) / 2) + Math.max(8, size * 0.02);
      const tx = Math.cos(midAngle) * textRadius;
      const ty = Math.sin(midAngle) * textRadius;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.fillStyle = '#111111';
      ctx.font = `800 ${Math.round(size * 0.05)}px "Roboto Condensed", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255, 224, 145, 0.35)';
      ctx.shadowBlur = Math.max(3, size * 0.008);
      ctx.shadowOffsetY = Math.max(1, size * 0.002);
      ctx.fillText(sector.text, 0, 0);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.restore();
    }

    currentAngle = endAngle;
    if (index === 0) currentAngle += (0.01 * Math.PI) / 180;
  });

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, innerOuterRadius, 0, 2 * Math.PI);
  ctx.lineWidth = Math.max(5, size * 0.012);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = Math.max(7, size * 0.019);
  ctx.stroke();
  ctx.restore();

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

  if (isSpinning || (displayNumber !== null && displayNumber !== undefined)) {
    const val = isSpinning ? currentCenterNumber : displayNumber;
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(size * 0.1)}px "Roboto Condensed", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = Math.max(10, size * 0.028);
    ctx.shadowOffsetY = Math.max(2, size * 0.004);
    ctx.fillText(String(val), 0, 0);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  ctx.restore();
}

export default function ReferenceWheel({ winningNumber, spinKey, onSpinComplete, showCenterValue = true }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const centerValueRef = useRef(null);
  const centerCoreRef = useRef(null);
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
      const next = Math.max(340, Math.min(Math.floor(node.clientWidth), 940));
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

      const centerValueNode = centerValueRef.current;
      const centerCoreNode = centerCoreRef.current;
      if (centerValueNode) {
        const liveValue = spinningRef.current
          ? getIndicatedNumber(angleRef.current)
          : (showCenterValue ? lastResultRef.current : null);

        if (showCenterValue && liveValue !== null && liveValue !== undefined) {
          centerValueNode.textContent = String(liveValue);
          centerValueNode.style.opacity = '1';
          if (centerCoreNode) {
            const pocketColor = getPocketColor(Number(liveValue));
            centerCoreNode.style.background = `radial-gradient(circle at 35% 35%, ${pocketColor}, #000000)`;
          }
        } else {
          centerValueNode.textContent = '';
          centerValueNode.style.opacity = '0';
          if (centerCoreNode) {
            centerCoreNode.style.background = 'radial-gradient(circle at 35% 35%, #8c1117, #000000)';
          }
        }
      }
      renderRafRef.current = requestAnimationFrame(render);
    };

    renderRafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(renderRafRef.current);
  }, [size, showCenterValue]);

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

    // FIX: Calculate target angle relative to 12 o'clock pointer
    const targetNumberAngle = (idx * OUTER_SEGMENT_ANGLE);
    const centerPocketShift = OUTER_SEGMENT_ANGLE / 2;
    
    // Normalize current position to find how much more to spin
    const currentRot = angleRef.current % (2 * Math.PI);
    const extraFullSpins = Math.PI * 16; // 8 full rounds
    
    // Calculate the clockwise distance needed to bring the target number to the top
    const distanceToTarget = (2 * Math.PI - currentRot - targetNumberAngle - centerPocketShift) + (2 * Math.PI);
    const totalSpin = extraFullSpins + (distanceToTarget % (2 * Math.PI));

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
      <div className="reference-wheel__ring">
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
              <div ref={centerCoreRef} className="reference-wheel__center-core">
                <div ref={centerValueRef} className="reference-wheel__center-value" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .reference-wheel {
          position: relative;
          width: 98vmin;
          height: 98vmin;
          max-width: 1020px;
          max-height: 1020px;
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
          width: 89vmin;
          height: 89vmin;
          max-width: 940px;
          max-height: 940px;
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
          width: 95vmin;
          height: 95vmin;
          max-width: 990px;
          max-height: 990px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(110deg, #c78d3a, #8c5a21 42%, #5b3410 58%, #b7792f 100%);
          filter: drop-shadow(0 0 12px rgba(0, 0, 0, 0.95)) drop-shadow(0 0 18px rgba(0, 0, 0, 0.8));
          box-shadow:
            0 12px 22px rgba(0, 0, 0, 0.4),
            inset 0 2px 8px rgba(255, 236, 190, 0.28),
            inset 0 -8px 14px rgba(70, 35, 8, 0.24),
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
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .reference-wheel__center-value {
          opacity: 0;
          color: #ffffff;
          font: 900 clamp(2rem, 5.4vw, 4.8rem) "Roboto Condensed", sans-serif;
          line-height: 1;
          text-shadow: 0 0 14px rgba(0, 0, 0, 0.72);
          transition: opacity 120ms linear;
        }

        @keyframes orbitBlink {
          0% { opacity: 0.3; box-shadow: 0 0 5px rgba(255, 215, 0, 0.4); }
          100% { opacity: 1; box-shadow: 0 0 15px rgba(255, 215, 0, 1); }
        }

        @keyframes rotateDots {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pointerShake {
          0% { transform: translateX(-50%) rotate(0deg); }
          50% { transform: translateX(-50%) rotate(5deg); }
          100% { transform: translateX(-50%) rotate(0deg); }
        }

        @media (max-width: 1023px) {
          .reference-wheel { width: min(94vw, 94vh); height: min(94vw, 94vh); }
          .reference-wheel__outer-frame { width: min(91vw, 91vh); height: min(91vw, 91vh); }
          .reference-wheel__ring { width: min(85vw, 85vh); height: min(85vw, 85vh); }
          .reference-wheel__pointer { top: 8px; }
        }
      `}</style>
    </div>
  );
}
