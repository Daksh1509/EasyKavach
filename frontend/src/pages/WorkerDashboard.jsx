import React, { useState, useEffect } from 'react';
import { analyticsService, claimService, workerService } from '../services/api';
import { ShieldCheck, Clock, CheckCircle2, AlertTriangle, CloudRain, ThermometerSun, Wind, RefreshCw, Navigation, Zap, Target, Shield, Heart, Activity, Cpu, Terminal, Layers, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  },
  exit: { opacity: 0, filter: "blur(10px)", transition: { duration: 0.3 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95, filter: "blur(5px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 120, damping: 15 } }
};

const ProtectionGauge = ({ percentage }) => {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * (circumference / 2);

  return (
    <div className="relative flex items-center justify-center w-48 h-24 overflow-hidden mt-2">
      <svg className="w-full h-full transform -rotate-180" viewBox="0 0 160 80">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#222" strokeWidth="16" strokeDasharray={`${circumference / 2} ${circumference / 2}`} />
        <motion.circle
          initial={{ strokeDashoffset: circumference / 2 }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx="80" cy="80" r={radius} fill="none" stroke="var(--emerald-glow)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${circumference / 2} ${circumference / 2}`}
        />
      </svg>
      <div className="absolute bottom-1 flex flex-col items-center leading-none">
        <span className="text-3xl font-black text-white">{percentage}%</span>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-glow mt-1">Health</span>
      </div>
    </div>
  );
};

const WorkerDashboard = ({ workerId }) => {
  const [data, setData] = useState(null);
  const [claims, setClaims] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [analytics, claimsRes, profileRes] = await Promise.all([
        analyticsService.getWorkerDashboard(workerId),
        claimService.getWorkerClaims(workerId),
        workerService.getProfile(workerId)
      ]);
      setData(analytics.data);
      setClaims(claimsRes.data);
      setProfile(profileRes.data);
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    return () => clearInterval(interval);
  }, [workerId]);

  const handleStatusToggle = async () => {
    if (!profile) return;
    try {
      const newStatus = !profile.is_online;
      await workerService.updateStatus(workerId, newStatus);
      setProfile({ ...profile, is_online: newStatus });
    } catch (err) {
      console.error("Failed to update status");
    }
  };

  if (isLoading) return null;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6 max-w-6xl mx-auto px-2 pb-20 overflow-x-hidden"
    >
      {/* Header Section */}
      <motion.section variants={itemVariants} className="relative flex flex-wrap items-center justify-between gap-6 p-8 rounded-[2rem] overflow-hidden bg-gradient-to-br from-carbon-dark to-carbon border border-emerald-tactical/30 shadow-[0_8px_32px_rgba(16,185,129,0.1)] group transition-all duration-500 hover:shadow-[0_8px_32px_rgba(16,185,129,0.15)]">
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-glow/5 rounded-full blur-3xl -z-10" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-carbon-dark border border-emerald-tactical/30 rounded-xl flex items-center justify-center shrink-0 shadow-inner group">
             <div className="absolute inset-0 bg-emerald-glow/5 group-hover:bg-emerald-glow/10 transition-colors" />
             <Navigation className="text-emerald-glow w-7 h-7 relative z-10" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-glow animate-pulse shadow-[0_0_8px_var(--emerald-glow)]"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-glow/70">System Connected</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-none uppercase">
              {greeting}, <span className="text-emerald-glow">{profile?.name?.split(' ')[0]}</span>
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <div className="bg-carbon-muted/50 border border-white/5 text-white/60 flex items-center gap-2 px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider">
                <Target size={12} className="text-emerald-glow" /> 
                {profile?.zone_id?.replace('_', ' ')}
              </div>
              <p className="text-white/40 font-bold text-[10px] uppercase tracking-widest border-l border-white/10 pl-3">Tier: Premium</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-carbon-dark/50 p-3 border border-white/5 shadow-inner relative z-10 min-w-[180px]">
          <div className="text-right px-1">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Status</p>
            <p className={`text-xs font-black tracking-widest uppercase ${profile?.is_online ? 'text-emerald-glow' : 'text-white/20'}`}>
              {profile?.is_online ? 'Live // Tracking' : 'Offline'}
            </p>
          </div>
          <button 
            onClick={handleStatusToggle}
            className={`w-[60px] h-9 rounded-md p-1.5 transition-all duration-300 flex items-center border ${profile?.is_online ? 'bg-emerald-glow/10 border-emerald-tactical/40 justify-end shadow-tactical' : 'bg-white/5 border-white/10 justify-start'}`}
          >
            <motion.div 
              layout
              className={`w-6 h-full rounded-sm shadow-sm flex items-center justify-center transition-colors duration-300 ${profile?.is_online ? 'bg-emerald-glow text-carbon-dark' : 'bg-white/10 text-white/20'}`}
            >
               <Zap size={14} className="fill-current" />
            </motion.div>
          </button>
        </div>
      </motion.section>

      {/* Primary Analytics Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <motion.div whileHover={{ scale: 1.02 }} className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-emerald-tactical/20 via-carbon-dark/90 to-carbon shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col justify-between group border border-white/5 border-l-4 border-l-emerald-glow/50 backdrop-blur-xl transition-all duration-500 col-span-2 md:col-span-1">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-glow/5 blur-2xl rounded-full group-hover:bg-emerald-glow/10 transition-colors" />
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-center">
               <Shield size={20} className="text-emerald-glow" />
               <div className="text-[9px] font-black uppercase bg-emerald-glow/10 text-emerald-glow border border-emerald-tactical/30 px-2 py-0.5 tracking-tighter">Secured</div>
            </div>
            <div>
              <p className="text-emerald-glow/60 font-black uppercase tracking-[0.2em] text-[10px] mb-1">Accumulated Coverage</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-emerald-glow">₹</span>
                <p className="text-4xl font-black text-white tracking-tighter leading-none">{(data?.earnings_protected || 0).toFixed(0)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="relative overflow-hidden p-6 rounded-3xl flex flex-col items-center justify-center bg-carbon-dark/80 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-emerald-glow/30 transition-all duration-500 col-span-2 md:col-span-2 group">
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-glow/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-10 w-full justify-around">
            <ProtectionGauge percentage={98} />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                 <Radio size={14} className="text-emerald-glow animate-pulse" />
                 <p className="text-emerald-glow font-black text-[10px] uppercase tracking-widest leading-none">Sensors: ONLINE</p>
              </div>
              <p className="text-white/40 font-bold text-xs max-w-[160px] leading-tight">
                Parametric validation active. Weather data confirmed.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="relative overflow-hidden p-6 space-y-5 rounded-3xl bg-carbon-dark/80 backdrop-blur-xl border border-white/10 border-l-4 border-l-emerald-glow/40 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-emerald-glow/30 transition-all duration-500 group">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-emerald-glow/5 rounded-lg text-emerald-glow border border-emerald-tactical/20 group-hover:bg-emerald-glow/10 transition-colors">
              <Activity size={20} />
            </div>
            <div className="text-right">
               <p className="text-4xl font-black text-white leading-none tracking-tighter">{data?.total_claims || 0}</p>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">Events Logged</p>
            </div>
          </div>
          <div className="pt-4 border-t border-white/5 space-y-2.5">
             <div className="flex justify-between items-center text-white/60 font-bold text-[10px] uppercase tracking-wider">
                <span>Risk Detection</span>
                <CheckCircle2 size={14} className="text-emerald-glow" />
             </div>
             <div className="flex justify-between items-center text-white/60 font-bold text-[10px] uppercase tracking-wider">
                <span>Claim Validation</span>
                <CheckCircle2 size={14} className="text-emerald-glow" />
             </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-2">
        {/* Settlement Ticker */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-carbon-dark/90 backdrop-blur-md px-6 py-4 border border-white/10 border-l-4 border-l-emerald-glow shadow-lg">
            <h2 className="text-xs font-black text-white tracking-[0.2em] flex items-center gap-3 uppercase">
              <Clock size={16} className="text-emerald-glow" /> Recent Claims
            </h2>
            <button onClick={fetchData} className="p-2 hover:bg-white/5 rounded transition-colors text-white/40 hover:text-emerald-glow">
              <RefreshCw className={`${isRefreshing ? 'animate-spin' : ''}`} size={16} />
            </button>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
            {claims.length > 0 ? (
              claims.map((claim) => (
                <motion.div 
                  key={claim.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative p-5 rounded-2xl flex items-center justify-between group cursor-pointer border border-white/5 hover:border-emerald-glow/40 bg-carbon-dark/60 backdrop-blur-xl shadow-lg hover:shadow-[0_8px_24px_rgba(16,185,129,0.15)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-carbon-dark border border-white/5 rounded text-emerald-glow group-hover:border-emerald-tactical/30 transition-colors">
                      {claim.disruption_type === 'heavy_rain' && <CloudRain size={22} />}
                      {claim.disruption_type === 'extreme_heat' && <ThermometerSun size={22} />}
                      {claim.disruption_type === 'hazardous_aqi' && <Wind size={22} className="text-white/40" />}
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-black text-white text-[13px] tracking-widest capitalize leading-none">{claim.disruption_type.replace('_', ' ')} Detected</h3>
                      <div className="flex items-center gap-3">
                         <div className="text-[10px] font-bold text-white/30 uppercase bg-black/40 px-2 py-0.5">{claim.disruption_duration_hours.toFixed(1)}h Impact</div>
                         <div className="text-[10px] font-bold text-white/30 uppercase bg-black/40 px-2 py-0.5">₹{claim.hourly_wage}/hr Baseline</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="text-2xl font-black text-white leading-none tracking-tighter">+₹{claim.adjusted_payout.toFixed(0)}</p>
                    <span 
                      className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 border transition-colors ${
                        claim.status === 'paid' ? 'bg-emerald-glow/10 text-emerald-glow border-emerald-glow/20' : 'bg-alert-orange/10 text-alert-orange border-alert-orange/20'
                      }`}
                    >
                      {claim.status === 'paid' ? 'Disbursed' : 'Processing'}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
                <div className="tactical-card py-12 text-center border-dashed border-white/10 bg-carbon-dark/20">
                  <Shield size={28} className="mx-auto mb-3 text-white/10" />
                  <p className="text-white/20 font-black tracking-widest text-[10px] uppercase">No environment disruptions detected in current sector</p>
                </div>
            )}
            </AnimatePresence>
          </div>
        </div>

        {/* Engine Visualization */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-xl bg-carbon-dark/90 backdrop-blur-md px-6 py-4 border border-white/10 border-l-4 border-l-alert-orange shadow-lg">
             <h2 className="text-xs font-black text-white tracking-[0.2em] uppercase">Risk Multipliers</h2>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-carbon-dark/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] group hover:border-alert-orange/30 transition-all duration-500">
            <div className="bg-gradient-to-br from-alert-orange/10 to-transparent p-5 border-b border-white/5 relative overflow-hidden">
              <div className="absolute right-[-20%] bottom-[-20%] text-alert-orange/5 group-hover:scale-110 transition-transform duration-500">
                 <Zap size={100} />
              </div>
              <p className="text-[9px] font-black text-alert-orange uppercase tracking-[0.2em] mb-2 relative z-10">Current Rate</p>
              <div className="flex items-baseline gap-1.5 relative z-10">
                <span className="text-lg font-bold text-alert-orange">₹</span>
                <p className="text-4xl font-black text-white tracking-tighter leading-none">124.00</p>
                <span className="text-[10px] font-black text-white/30 ml-1 uppercase">/ hr</span>
              </div>
            </div>
            <div className="p-5 space-y-4 bg-carbon-dark/40">
              {[
                { label: 'Risk Multiplier', val: '1.2x', color: 'text-alert-orange' },
                { label: 'API Latency', val: '0.04%', color: 'text-white/40' },
                { label: 'Proximity', val: '0.9x', color: 'text-emerald-glow' },
                { label: 'Weather Mod.', val: '1.4x', color: 'text-white' }
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center group/row border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{row.label}</span>
                  <span className={`text-[13px] font-black ${row.color} tracking-wider`}>{row.val}</span>
                </div>
              ))}
              
              <div className="mt-4 pt-4 border-t border-white/5 flex items-start gap-3 bg-carbon-dark/60 p-3">
                 <Terminal size={14} className="text-emerald-glow shrink-0 mt-0.5" />
                 <p className="text-[10px] text-white/40 font-bold leading-tight uppercase tracking-tight">
                   Validation protocol: System verified. Claim approval engaged.
                 </p>
              </div>
            </div>
          </div>
          
          <button className="tactical-btn-emerald w-full justify-center">
             <Layers size={14} />
             More Details
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WorkerDashboard;
