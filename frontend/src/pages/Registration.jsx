import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workerService, policyService } from '../services/api';
import { MapPin, Phone, Briefcase, ChevronRight, CheckCircle2, Loader2, Sparkles, CreditCard, ShieldCheck, ArrowRight, Shield, User, Cpu, Terminal, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Registration = ({ setWorkerId }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    upi_id: '',
    zone_id: '',
    area_type: 'commercial',
    shifts: ['evening']
  });

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await workerService.listZones();
        setZones(res.data);
      } catch (err) {
        console.error("Failed to fetch zones", err);
      }
    };
    fetchZones();
  }, []);

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      const res = await workerService.register(formData);
      const worker = res.data;
      setWorkerId(worker.id);
      
      // Auto-create initial policy
      await policyService.create(worker.id);
      
      setStep(4); // Success step
    } catch (err) {
      alert("Registration failed. Please check your connection or try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIcon = (s) => {
    if (step > s) return <CheckCircle2 className="text-emerald-glow w-6 h-6 shadow-[0_0_8px_var(--emerald-glow)]" />;
    return (
      <div className={`w-10 h-10 rounded shadow-inner flex items-center justify-center text-[11px] font-black tracking-widest transition-all duration-300 border ${
        step === s ? 'bg-emerald-glow text-carbon-dark border-emerald-glow scale-110 shadow-tactical-glow' : 'bg-carbon-dark/50 text-white/20 border-white/5'
      }`}>
        {s.toString().padStart(2, '0')}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" } }}
      exit={{ opacity: 0, y: -20, filter: "blur(5px)", transition: { duration: 0.3 } }}
      className="max-w-[640px] mx-auto relative py-16 px-4"
    >
      <div className="text-center mb-16 space-y-4">
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-center gap-3 text-emerald-glow mb-2"
        >
          <Cpu size={18} className="animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Worker Registration // EasyKavach</span>
        </motion.div>
        <h1 className="text-5xl font-black text-white tracking-tighter leading-none uppercase glitch-text">
          Worker <span className="text-emerald-glow">Onboarding</span>
        </h1>
        <p className="text-white/30 font-bold text-[11px] uppercase tracking-widest leading-relaxed">Secure your income protection with our parametric insurance.</p>
      </div>

      {/* Progress Stepper */}
      <motion.div 
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex items-center justify-between px-20 mb-16 relative"
      >
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 -z-10 -translate-y-1/2"></div>
        {[1, 2, 3].map(s => (
          <div key={s} className="bg-carbon-dark px-4 transition-colors duration-500">{renderStepIcon(s)}</div>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {step === 1 && (
            <motion.div 
            key="step1"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="relative overflow-hidden p-10 border border-white/10 bg-carbon-dark/70 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-3xl transition-all duration-500 hover:border-emerald-glow/20"
          >
            <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
              <h2 className="text-sm font-black text-white tracking-[0.2em] flex items-center gap-4 uppercase">
                <Terminal className="text-emerald-glow" size={20} /> Personal Profile
              </h2>
              <span className="text-[10px] font-black text-emerald-glow/40 uppercase tracking-widest px-3 py-1 bg-white/5 rounded">Stage 01</span>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-white/30 mb-2 uppercase tracking-[0.2em] ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Sunder Seth"
                  className="tactical-input w-full p-4 text-[13px] tracking-widest placeholder:text-white/10" 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-white/30 mb-2 uppercase tracking-[0.2em] ml-1">Phone Number</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+91 00000 00000"
                    className="tactical-input w-full p-4 text-[13px] tracking-widest placeholder:text-white/10" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-white/30 mb-2 uppercase tracking-[0.2em] ml-1">UPI ID</label>
                  <input 
                    type="text" 
                    value={formData.upi_id}
                    onChange={(e) => setFormData({...formData, upi_id: e.target.value})}
                    placeholder="yourname@upi"
                    className="tactical-input w-full p-4 text-[13px] tracking-widest placeholder:text-white/10" 
                  />
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setStep(2)}
              className="tactical-btn-emerald w-full mt-12 py-4 justify-center"
              disabled={!formData.name || !formData.phone}
            >
              Select Operation Zones <ChevronRight size={18} />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="relative overflow-hidden p-10 border border-emerald-tactical/30 bg-carbon-dark/70 backdrop-blur-2xl shadow-[0_8px_32px_rgba(16,185,129,0.15)] rounded-3xl transition-all duration-500"
          >
            <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
              <h2 className="text-sm font-black text-white tracking-[0.2em] flex items-center gap-4 uppercase">
                <MapPin className="text-emerald-glow" size={20} /> Zone Allocation
              </h2>
              <span className="text-[10px] font-black text-emerald-glow/40 uppercase tracking-widest px-3 py-1 bg-white/5 rounded">Stage 02</span>
            </div>

            <div className="grid grid-cols-1 gap-4 max-h-[380px] overflow-y-auto pr-3 custom-scrollbar">
              {zones.map(zone => (
                <motion.div 
                  key={zone.id}
                  whileHover={{ x: 5 }}
                  onClick={() => setFormData({...formData, zone_id: zone.id})}
                  className={`p-6 rounded-2xl border transition-all duration-300 flex items-center justify-between cursor-pointer ${
                    formData.zone_id === zone.id 
                    ? 'border-emerald-glow bg-emerald-glow/5 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                    : 'border-white/5 bg-carbon-dark/50 hover:bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${formData.zone_id === zone.id ? 'bg-emerald-glow text-carbon-dark shadow-tactical' : 'bg-white/5 text-white/20'}`}>
                      <MapPin size={22} className="fill-current" />
                    </div>
                    <div>
                      <p className={`font-black text-sm tracking-[0.2em] transition-colors uppercase ${formData.zone_id === zone.id ? 'text-white' : 'text-white/60'}`}>{zone.name}</p>
                      <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.1em] mt-1.5">{zone.city} Sector • Risk Score: {zone.base_risk_score?.toFixed(1) || '0.0'}</p>
                    </div>
                  </div>
                  {formData.zone_id === zone.id && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-emerald-glow text-carbon-dark flex items-center justify-center shadow-tactical"
                    >
                      <CheckCircle2 size={14} className="stroke-[3]" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
            
            <div className="flex gap-6 mt-12">
              <button 
                onClick={() => setStep(1)}
                className="tactical-btn hover:bg-white/5 text-white/40 border border-white/5 flex-1 justify-center"
              >
                Back
              </button>
              <button 
                onClick={() => setStep(3)}
                className="tactical-btn-emerald flex-[2] justify-center"
                disabled={!formData.zone_id}
              >
                Continue <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative overflow-hidden p-10 border border-alert-orange/30 bg-carbon-dark/70 backdrop-blur-2xl shadow-[0_8px_32px_rgba(234,88,12,0.15)] rounded-3xl transition-all duration-500"
          >
            <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
              <h2 className="text-sm font-black text-white tracking-[0.2em] flex items-center gap-4 uppercase">
                <Briefcase className="text-alert-orange" size={20} /> Shift Registration
              </h2>
              <span className="text-[10px] font-black text-alert-orange/40 uppercase tracking-widest px-3 py-1 bg-white/5 rounded">Stage 03</span>
            </div>

            <div className="space-y-10">
              <div className="p-8 bg-carbon-dark/80 rounded border-l-4 border-alert-orange relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 text-alert-orange/5 group-hover:scale-110 transition-transform duration-500">
                   <Zap size={100} />
                </div>
                <p className="text-[10px] uppercase font-black text-alert-orange tracking-[0.2em] mb-3">Base Premium Rate</p>
                <div className="flex items-baseline gap-2">
                   <span className="text-xl font-black text-alert-orange">₹</span>
                   <p className="text-5xl font-black text-white tracking-tighter leading-none">40.00</p>
                   <span className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-2">/ Shift</span>
                </div>
                <p className="text-[11px] text-white/40 font-bold mt-5 leading-relaxed uppercase tracking-wide">Automatic disbursement up to <span className="text-white font-black">₹400 per incident</span>. Documentation-free settlement.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {['morning', 'afternoon', 'evening', 'night'].map(sh => (
                  <button
                    key={sh}
                    onClick={() => {
                      const newShifts = formData.shifts.includes(sh) 
                        ? formData.shifts.filter(s => s !== sh)
                        : [...formData.shifts, sh];
                      setFormData({...formData, shifts: newShifts});
                    }}
                    className={`p-5 rounded-2xl border font-black uppercase tracking-[0.2em] transition-all duration-300 text-[10px] flex items-center justify-center gap-3 hover:-translate-y-0.5 ${
                      formData.shifts.includes(sh)
                      ? 'border-alert-orange bg-alert-orange/10 text-alert-orange shadow-[0_0_15px_rgba(234,88,12,0.2)]'
                      : 'border-white/5 bg-carbon-dark/40 text-white/20 hover:border-white/20'
                    }`}
                  >
                    {formData.shifts.includes(sh) && <div className="w-1.5 h-1.5 rounded-full bg-alert-orange shadow-[0_0_8px_#EA580C]" />}
                    {sh}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-6 mt-12">
              <button 
                onClick={() => setStep(2)}
                className="tactical-btn hover:bg-white/5 text-white/40 border border-white/5 flex-1 justify-center"
              >
                Back
              </button>
              <button 
                onClick={handleRegister}
                className="tactical-btn-alert flex-[2] justify-center bg-alert-orange"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <>Activate Coverage <ShieldCheck size={20} className="stroke-[2.5]" /></>}
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            key="step4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden text-center py-20 px-10 border border-emerald-tactical/40 bg-carbon-dark/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(16,185,129,0.2)] rounded-[2.5rem] transition-all duration-500"
          >
            <div className="w-24 h-24 bg-emerald-glow text-carbon-dark rounded-full flex items-center justify-center mx-auto mb-10 shadow-tactical-glow relative">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-glow animate-ping -z-10" />
              <CheckCircle2 size={48} className="stroke-[3]" />
            </div>
            <h2 className="text-4xl font-black mb-4 text-white tracking-tighter leading-none uppercase">Registration <br /> Confirmed</h2>
            <p className="text-white/40 mb-12 max-w-sm mx-auto font-bold text-[11px] uppercase tracking-widest leading-relaxed">
              Your policy for <span className="text-emerald-glow font-black">{formData.name}</span> in sector <span className="text-emerald-glow font-black">{formData.zone_id.replace('_', ' ')}</span> has been successfully created.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="tactical-btn-emerald px-12 py-4 mx-auto text-sm"
            >
              Go to Dashboard <ArrowRight size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Registration;
