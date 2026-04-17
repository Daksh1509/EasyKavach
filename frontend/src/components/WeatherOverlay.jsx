import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Weather-reactive visual overlay.
 * Renders rain drops, dark clouds, heat shimmer, or AQI haze
 * depending on the activeWeather prop.
 *
 * @param {{ activeWeather: 'rain' | 'heat' | 'aqi' | 'flood' | 'clear' | null }} props
 */
export default function WeatherOverlay({ activeWeather = 'clear' }) {
  const weather = (activeWeather || 'clear').toLowerCase();

  const isRain = weather.includes('rain') || weather.includes('flood');
  const isHeat = weather.includes('heat');
  const isAqi = weather.includes('aqi');
  const isFlood = weather.includes('flood');

  // Generate rain drops once
  const rainDrops = useMemo(() => {
    if (!isRain) return [];
    return Array.from({ length: 120 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 2,
      duration: 0.5 + Math.random() * 0.4,
      opacity: 0.25 + Math.random() * 0.5,
      width: Math.random() > 0.5 ? 2 : 1.5,
      height: 22 + Math.random() * 30,
    }));
  }, [isRain]);

  // Generate cloud positions
  const clouds = useMemo(() => {
    if (!isRain) return [];
    return [
      { left: '-5%', width: '35%', delay: 0, y: '-2%' },
      { left: '20%', width: '40%', delay: 0.5, y: '-4%' },
      { left: '55%', width: '30%', delay: 1, y: '-1%' },
      { left: '75%', width: '35%', delay: 1.5, y: '-3%' },
    ];
  }, [isRain]);

  if (weather === 'clear' || (!isRain && !isHeat && !isAqi)) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    >
      {/* === RAIN + CLOUDS === */}
      {isRain && (
        <>
          {/* Dark storm tint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="absolute inset-0"
            style={{
              background: isFlood
                ? 'linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(30,58,138,0.2) 100%)'
                : 'linear-gradient(180deg, rgba(30,41,59,0.4) 0%, rgba(51,65,85,0.15) 50%, transparent 80%)',
            }}
          />

          {/* Clouds */}
          {clouds.map((cloud, i) => (
            <motion.div
              key={`cloud-${i}`}
              initial={{ opacity: 0, x: '-10%', y: cloud.y }}
              animate={{
                opacity: [0, 0.85, 0.75, 0.85],
                x: ['0%', '3%', '-2%', '0%'],
              }}
              transition={{
                duration: 12 + i * 3,
                repeat: Infinity,
                delay: cloud.delay,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: cloud.left,
                width: cloud.width,
                height: '120px',
              }}
            >
              {/* Main cloud body */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'radial-gradient(ellipse at 50% 90%, rgba(30,41,59,0.98) 0%, rgba(51,65,85,0.7) 35%, transparent 65%)',
                  borderRadius: '50%',
                  filter: 'blur(6px)',
                }}
              />
              {/* Cloud highlight */}
              <div
                style={{
                  position: 'absolute',
                  top: '10%',
                  left: '15%',
                  width: '70%',
                  height: '60%',
                  background: 'radial-gradient(ellipse at 50% 80%, rgba(71,85,105,0.8) 0%, transparent 55%)',
                  borderRadius: '50%',
                  filter: 'blur(10px)',
                }}
              />
            </motion.div>
          ))}

          {/* Lightning flash (occasional) */}
          {isFlood && (
            <motion.div
              animate={{
                opacity: [0, 0, 0, 0.6, 0, 0.3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at 40% 10%, rgba(147,197,253,0.3) 0%, transparent 50%)',
              }}
            />
          )}

          {/* Rain drops */}
          {rainDrops.map((drop) => (
            <motion.div
              key={`rain-${drop.id}`}
              initial={{ y: '-5%', opacity: 0 }}
              animate={{ y: '105vh', opacity: [0, drop.opacity, drop.opacity, 0] }}
              transition={{
                duration: drop.duration,
                repeat: Infinity,
                delay: drop.delay,
                ease: 'linear',
              }}
              style={{
                position: 'absolute',
                left: drop.left,
                top: 0,
                width: `${drop.width}px`,
                height: `${drop.height}px`,
                background: `linear-gradient(180deg, transparent, rgba(100,116,139,${drop.opacity}))`,
                borderRadius: '0 0 2px 2px',
                boxShadow: `0 0 3px rgba(100,116,139,${drop.opacity * 0.3})`,
              }}
            />
          ))}

          {/* Fog at bottom for flood */}
          {isFlood && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ duration: 3 }}
              className="absolute bottom-0 left-0 right-0 h-[30%]"
              style={{
                background: 'linear-gradient(0deg, rgba(30,58,138,0.25) 0%, transparent 100%)',
                filter: 'blur(20px)',
              }}
            />
          )}
        </>
      )}

      {/* === HEAT SHIMMER === */}
      {isHeat && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(234,88,12,0.08) 0%, rgba(220,38,38,0.05) 50%, transparent 100%)',
            }}
          />
          {/* Heat waves */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`heat-${i}`}
              animate={{
                y: [0, -8, 0, 8, 0],
                scaleX: [1, 1.02, 1, 0.98, 1],
              }}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                delay: i * 1.2,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                bottom: `${15 + i * 20}%`,
                left: 0,
                right: 0,
                height: '2px',
                background: `linear-gradient(90deg, transparent 5%, rgba(234,88,12,${0.12 - i * 0.03}) 30%, rgba(239,68,68,${0.08 - i * 0.02}) 70%, transparent 95%)`,
                filter: 'blur(3px)',
              }}
            />
          ))}
        </>
      )}

      {/* === AQI HAZE === */}
      {isAqi && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 3 }}
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(120,113,108,0.2) 0%, rgba(168,162,158,0.08) 50%, transparent 80%)',
            backdropFilter: 'blur(1px)',
          }}
        />
      )}
    </div>
  );
}
