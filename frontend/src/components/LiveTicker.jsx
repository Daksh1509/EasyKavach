import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, ShieldCheck, TrendingUp, AlertTriangle, Radio, Globe, Terminal } from 'lucide-react';
import { claimService } from '../services/api';

const LiveTicker = () => {
  const defaultActivities = [
    { id: 1, type: 'analytics', text: 'SYSTEM: X-SHIELD MESH ONLINE // LISTENING', icon: Radio, color: 'text-emerald-glow' },
    { id: 2, type: 'policy', text: 'NODE: ACTIVE // MONITORS VERIFIED', icon: ShieldCheck, color: 'text-white/40' },
  ];
  
  const [activities, setActivities] = useState(defaultActivities);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const claimsRes = await claimService.list('paid');
        const recentClaims = claimsRes.data.slice(0, 8).map(c => ({
          id: `claim_${c.id}`,
          type: 'settlement',
          text: `PROTOCOL: ₹${c.adjusted_payout.toFixed(2)} DISBURSED // ${c.zone_id.replace('_', ' ').toUpperCase()}`,
          icon: Terminal,
          color: 'text-emerald-glow'
        }));
        
        if (recentClaims.length > 0) {
           setActivities(recentClaims);
        }
      } catch (err) {
        // Fallback to default silently
      }
    };
    
    fetchEvents();
    const interval = setInterval(fetchEvents, 15000); // 15s polling
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-carbon/80 backdrop-blur-md border-b border-white/5 py-2.5 overflow-hidden select-none z-40 relative">
      <motion.div
        animate={{ x: [0, -1600] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 60,
            ease: "linear",
          },
        }}
        className="flex whitespace-nowrap gap-12 items-center"
      >
        {[...activities, ...activities, ...activities, ...activities].map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
             <item.icon size={12} className={item.color} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
               {item.text}
             </span>
             <div className="w-1.5 h-1.5 bg-emerald-glow/20 rounded-full mx-2" />
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default LiveTicker;
