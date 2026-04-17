import React from 'react';

export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] bg-carbon-dark">
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-emerald-glow/15 rounded-full blur-[140px] mix-blend-screen" />
      <div className="absolute bottom-[-10%] left-[60%] w-[40%] h-[40%] bg-alert-orange/10 rounded-full blur-[160px] mix-blend-screen" />
      <div className="absolute top-[30%] left-[80%] w-[30%] h-[30%] bg-security-blue/10 rounded-full blur-[120px] mix-blend-screen" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:80px_80px] opacity-[0.15]" />
      <div className="absolute inset-0 bg-gradient-to-t from-carbon-dark via-transparent to-carbon-dark/50" />
    </div>
  );
}
