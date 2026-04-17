import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * A 3D tilt card wrapper that responds to mouse movement.
 * Provides a premium, perspective-aware interaction effect.
 *
 * @param {{ children: React.ReactNode, className?: string, glareColor?: string, intensity?: number }} props
 */
export default function TiltCard({
  children,
  className = '',
  glareColor = 'rgba(16,185,129,0.08)',
  intensity = 12,
  ...rest
}) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setTilt({
      rotateX: (0.5 - y) * intensity,
      rotateY: (x - 0.5) * intensity,
    });
    setGlare({
      x: x * 100,
      y: y * 100,
      opacity: 0.15,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: tilt.rotateX,
        rotateY: tilt.rotateY,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative ${className}`}
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      }}
      {...rest}
    >
      {children}

      {/* Glare highlight that follows the cursor */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, ${glareColor} 0%, transparent 60%)`,
          opacity: glare.opacity,
        }}
      />
    </motion.div>
  );
}
