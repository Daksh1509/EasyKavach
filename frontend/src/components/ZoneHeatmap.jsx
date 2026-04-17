import React from 'react';
import { motion } from 'framer-motion';

const ZoneHeatmap = ({ zones = [] }) => {
  return (
    <div className="relative group w-full aspect-square bg-carbon-dark rounded-xl border border-white/5 p-4 overflow-hidden shadow-inner">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#10B981_1px,transparent_1px),linear-gradient(to_bottom,#10B981_1px,transparent_1px)] bg-[size:30px_30px]"></div>
      
      {/* City Map Outlines (Abstract) */}
      <svg viewBox="0 0 400 400" className="w-full h-full relative z-10">
        {zones.map((zone, idx) => {
          const x = 50 + (idx % 2 === 0 ? idx * 80 : 350 - idx * 70);
          const y = 80 + (idx * 60 + idx * idx * 2) % 250;
          const radius = 30 + (zone.base_risk_score || 0) * 50;
          const color = (zone.base_risk_score || 0) > 0.6 ? '#EA580C' : (zone.base_risk_score || 0) > 0.3 ? '#F59E0B' : '#10B981';
          
          return (
            <g key={zone.id || idx} className="cursor-pointer group/node">
              <motion.circle
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.12 }}
                cx={x} cy={y} r={radius * 1.5} fill={color}
              />
              <motion.circle
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
                cx={x} cy={y} r={radius}
                fill={color} fillOpacity={0.4}
                className="filter blur-lg"
              />
              <circle
                cx={x} cy={y} r={4}
                fill="#0F172A" className="group-hover/node:fill-emerald-glow transition-colors stroke-2 stroke-white/20"
                filter="url(#warmglow)"
              />
              <text
                x={x + 10} y={y + 5}
                className="text-[10px] font-black fill-white/40 uppercase tracking-widest pointer-events-none group-hover/node:fill-white transition-all font-sans"
              >
                {zone.name?.split(',')[0] || 'Zone'}
              </text>
            </g>
          );
        })}
        
        <defs>
          <filter id="warmglow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-3 bg-carbon/80 backdrop-blur-sm px-3 py-1.5 rounded border border-white/5">
        {[
          { color: '#10B981', label: 'Optimal' },
          { color: '#F59E0B', label: 'Warn' },
          { color: '#EA580C', label: 'Critical' }
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: item.color, color: item.color }}></div>
            <span className="text-[8px] font-black uppercase tracking-widest text-white/50">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ZoneHeatmap;
