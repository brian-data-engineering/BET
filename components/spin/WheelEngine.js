import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

// The wheel order from your image (34 is index 0)
const wheelNumbers = [
  34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 
  22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25, 17
];

const WheelEngine = ({ winningNumber, onSpinComplete }) => {
  const wheelRef = useRef(null);

  useEffect(() => {
    if (winningNumber === null || winningNumber === undefined) return;

    // 1. Find where the number is on the wheel
    const index = wheelNumbers.indexOf(winningNumber);
    
    // 2. Calculate the rotation
    // One segment is ~9.73 degrees (360 / 37)
    const segmentDegree = 360 / 37;
    const targetDegree = index * segmentDegree;
    
    // 3. Add 5 full spins (1800 deg) so it looks high-speed
    const totalRotation = 1800 + (360 - targetDegree);

    // 4. Animate!
    gsap.to(wheelRef.current, {
      rotation: totalRotation,
      duration: 8, // 8 seconds of excitement
      ease: "power4.out",
      onComplete: () => {
        if (onSpinComplete) onSpinComplete();
        // Reset rotation internally so the next spin works
        gsap.set(wheelRef.current, { rotation: totalRotation % 360 });
      }
    });
  }, [winningNumber]);

  return (
    <div className="wheel-container relative flex justify-center items-center">
      {/* The Pointer (Stationary) */}
      <div className="absolute top-0 z-10 w-8 h-8 bg-yellow-500 clip-path-triangle" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}></div>
      
      {/* The Wheel (Rotates) */}
      <div ref={wheelRef} className="w-80 h-80 rounded-full border-8 border-gray-800 shadow-2xl overflow-hidden relative bg-black">
        {/* You would map your segments here or use a background image */}
        <img src="/assets/roulette-wheel.png" alt="Wheel" className="w-full h-full" />
      </div>
    </div>
  );
};

export default WheelEngine;
