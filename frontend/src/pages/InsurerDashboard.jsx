import React, { useState, useEffect } from 'react';
import { analyticsService, claimService, triggerService } from '../services/api';
import { ShieldCheck, CloudRain, Wind, ThermometerSun, RefreshCw, UserCheck, Search, TrendingUp, Zap, Activity, Shield, Flame, AlertTriangle, ArrowUpRight, Globe, Layers, Cpu, Terminal } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import ZoneHeatmap from '../components/ZoneHeatmap';

const TiltCard = ({ children, className = "" }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["4deg", "-4deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-4deg", "4deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`tactical-card ${className}`}
    >
      <div style={{ transform: "translateZ(20px)" }}>{children}</div>
    </motion.div>
  );
};

const InsurerDashboard = () => {
  const [data, setData] = useState(null);
  const [claims, setClaims] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [testZoneId, setTestZoneId] = useState('koramangala_blr');

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [overview, claimsRes] = await Promise.all([
        analyticsService.getInsurerOverview(),
        claimService.list()
      ]);
      setData(overview.data);
      setClaims(claimsRes.data);
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleTestTrigger = async () => {
    try {
      await triggerService.checkNow(testZoneId);
      fetchData();
    } catch (err) {
      console.error("Failed to force trigger check.");
    }
  };

  if (isLoading) return null;

  const overview = data?.insurer_overview;
  const heatmaps = data?.zone_heatmaps;

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-2">
      {/* Hero Section */}
      <section className="tactical-card-alert flex flex-wrap items-end justify-between gap-6 p-6 overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-alert-orange/5 blur-3xl pointer-events-none -z-10" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-alert-orange shadow-[0_0_8px_#EA580C] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-alert-orange/70">Parametric Oversight Engine // Terminal 01</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">
            Risk <span className="text-alert-orange">Intelligence</span>
          </h1>
          <p className="text-white/40 font-bold text-[11px] uppercase tracking-wider">
            Active oversight for <span className="text-emerald-glow font-black">{overview?.total_workers}</span> tracked entities across multi-sector zones.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-carbon-dark/50 p-2.5 border border-white/5 shadow-inner relative z-10">
          <select 
            value={testZoneId}
            onChange={(e) => setTestZoneId(e.target.value)}
            className="tactical-input py-1.5 text-[10px] w-40"
          >
            <option value="koramangala_blr">Koramangala Sector</option>
            <option value="velachery_chn">Velachery Sector</option>
            <option value="cp_delhi">NCR Central Hub</option>
            <option value="bandra_mumbai">Bandra West Block</option>
          </select>
          <button 
            onClick={handleTestTrigger}
            className="tactical-btn-alert py-2 px-6"
            disabled={isRefreshing}
          >
            <Zap size={12} className={`fill-current ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Force Probe</span>
          </button>
        </div>
      </section>

      {/* Global Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Exposure', value: `₹${(overview?.total_payouts_amount || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-alert-orange', border: 'border-alert-orange/40', trend: '+12.5%' },
          { label: 'Security Score', value: `${(100 - (overview?.fraud_rate || 0) * 100).toFixed(1)}%`, icon: ShieldCheck, color: 'text-emerald-glow', border: 'border-emerald-glow/40', trend: 'Optimal' },
          { label: 'Loss Ratio', value: `${((overview?.loss_ratio || 0) * 100).toFixed(1)}%`, icon: Activity, color: 'text-alert-orange', border: 'border-alert-orange/40', trend: '-2.1%' },
          { label: 'Active Nodes', value: (overview?.active_policies_count || 0).toString(), icon: UserCheck, color: 'text-white', border: 'border-white/20', trend: 'Growing' }
        ].map((stat) => (
          <TiltCard key={stat.label} className={`group border-l-4 ${stat.border}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-lg bg-carbon-dark/80 border border-white/5 ${stat.color} shadow-inner group-hover:scale-110 transition-transform`}>
                <stat.icon size={18} />
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-white/5 border border-white/10 text-white/40">
                {stat.trend}
              </div>
            </div>
            <p className="text-white/30 font-black uppercase tracking-[0.15em] text-[10px] mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-white tracking-tighter leading-none">{stat.value}</p>
          </TiltCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Spatial Intelligence Heatmap */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between bg-carbon-dark/80 px-4 py-2 border border-white/5 border-l-4 border-alert-orange shadow-tactical">
            <h2 className="text-[10px] font-black text-white tracking-[0.2em] uppercase flex items-center gap-3">
              <Globe size={14} className="text-alert-orange" /> Sector Risk Topography
            </h2>
          </div>
          <div className="tactical-card p-1 border-white/5 bg-carbon/40">
             <ZoneHeatmap zones={heatmaps} />
          </div>
          
          <div className="tactical-card border-white/5 p-5 space-y-4 bg-carbon/60">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-alert-orange flex items-center gap-2">
              <AlertTriangle size={12} className="animate-pulse" /> Critical Zone Alerts
            </h3>
            <div className="space-y-2">
              {heatmaps?.slice(0, 4).map(zone => (
                <div key={zone.zone_id} className="flex items-center justify-between group cursor-pointer p-3 rounded bg-carbon-dark/40 border border-white/5 hover:border-alert-orange/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-1 h-8 rounded-full transition-all duration-300 ${zone.risk_score > 0.4 ? 'bg-alert-orange shadow-[0_0_8px_#EA580C]' : 'bg-emerald-glow/50'}`}></div>
                    <div>
                      <p className="text-[12px] font-black text-white uppercase tracking-wider leading-none">{zone.zone_name.split(',')[0]}</p>
                      <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.1em] mt-1">{zone.active_disruptions_count} Active Triggers</p>
                    </div>
                  </div>
                  <ArrowUpRight size={14} className="text-white/10 group-hover:text-alert-orange transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Claims Table */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between bg-carbon-dark/80 px-4 py-2 border border-white/5 border-l-4 border-emerald-glow shadow-tactical">
            <h2 className="text-[10px] font-black text-white tracking-[0.2em] uppercase flex items-center gap-3">
              <Layers size={14} className="text-emerald-glow" /> Automated Settlement Stream
            </h2>
            <div className="flex items-center gap-4">
              <button onClick={fetchData} className="p-1.5 hover:bg-white/5 rounded text-white/40 hover:text-emerald-glow transition-colors">
                <RefreshCw className={`${isRefreshing ? 'animate-spin' : ''}`} size={14} />
              </button>
              <div className="flex items-center gap-2 bg-carbon/50 border border-white/10 rounded px-3 py-1">
                <Search size={12} className="text-white/20" />
                <input type="text" placeholder="Probe Ledger..." className="text-[10px] outline-none bg-transparent font-bold text-white/60 w-32 placeholder-white/10 uppercase tracking-widest" />
              </div>
            </div>
          </div>

          <div className="tactical-card p-0 overflow-hidden border-white/5 bg-carbon/40 shadow-tactical">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-carbon-dark/60 border-b border-white/5">
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Entity ID</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Trigger Event</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 text-center">Trust Index</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 text-right">Disbursement</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 text-right">Protocol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {claims.slice(0, 10).map((claim) => (
                    <tr key={claim.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded bg-carbon-dark border border-white/10 flex items-center justify-center text-[10px] font-black text-emerald-glow group-hover:border-emerald-tactical/40 transition-colors">
                            {claim.worker_id.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-xs text-white tracking-widest">{claim.worker_id.substring(0, 8).toUpperCase()}</p>
                            <p className="text-[9px] text-white/20 font-black uppercase tracking-tighter mt-0.5">{claim.zone_id.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-carbon-dark rounded border border-white/5 group-hover:border-white/10 transition-colors">
                            {claim.disruption_type === 'heavy_rain' && <CloudRain size={16} className="text-emerald-glow" />}
                            {claim.disruption_type === 'extreme_heat' && <ThermometerSun size={16} className="text-alert-orange" />}
                            {claim.disruption_type === 'hazardous_aqi' && <Wind size={16} className="text-white/40" />}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{claim.disruption_type.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center gap-2">
                          <span className={`text-[10px] font-black tracking-widest uppercase ${claim.fraud_probability > 0.6 ? 'text-alert-orange' : 'text-emerald-glow'}`}>
                            {((1 - claim.fraud_probability) * 100).toFixed(0)}% TRUST
                          </span>
                          <div className="w-20 h-1 bg-carbon-dark rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(1 - claim.fraud_probability) * 100}%` }}
                              transition={{ duration: 1 }}
                              className={`${claim.fraud_probability > 0.6 ? 'bg-alert-orange shadow-[0_0_8px_#EA580C]' : 'bg-emerald-glow shadow-[0_0_8px_#10B981]'} h-full`} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-black text-lg text-white tracking-tighter">₹{claim.adjusted_payout.toFixed(0)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end">
                          <div className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] border transition-colors ${
                            claim.status === 'paid' ? 'bg-emerald-glow/5 text-emerald-glow border-emerald-tactical/30' : 'bg-white/5 text-white/30 border-white/10'
                          }`}>
                            {claim.status === 'paid' ? 'Settled' : 'Queue'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {claims.length === 0 && (
              <div className="p-20 text-center">
                <div className="w-14 h-14 bg-carbon-dark rounded border border-white/5 flex items-center justify-center mx-auto mb-4 group-hover:border-emerald-tactical transition-colors">
                  <ShieldCheck size={26} className="text-white/10" />
                </div>
                <p className="text-white/20 font-black tracking-[0.2em] uppercase text-[10px]">No anomalies detected in operational sectors.</p>
              </div>
            )}
          </div>
          
          {/* System Telemetry */}
          <div className="grid grid-cols-2 gap-4">
             <div className="tactical-card p-4 flex items-center gap-4 bg-carbon/60 border-white/5">
                <div className="p-2 bg-emerald-glow/5 border border-emerald-tactical/20 rounded">
                   <Cpu size={16} className="text-emerald-glow" />
                </div>
                <div>
                   <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Logic Load</p>
                   <p className="text-lg font-black text-white leading-none mt-0.5">0.04%</p>
                </div>
             </div>
             <div className="tactical-card p-4 flex items-center gap-4 bg-carbon/60 border-white/5">
                <div className="p-2 bg-alert-orange/5 border border-alert-orange/20 rounded">
                   <Terminal size={16} className="text-alert-orange" />
                </div>
                <div>
                   <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Protocol Version</p>
                   <p className="text-lg font-black text-white leading-none mt-0.5">X-SHIELD.04</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsurerDashboard;
