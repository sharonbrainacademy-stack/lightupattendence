import React from 'react';
import { Flame, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 bg-purple-950 border-t border-amber-500/30 text-white py-10 px-4 sm:px-6 no-print">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center space-y-4">
        
        {/* Flame Logo */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <span className="font-extrabold font-cinzel text-lg tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
            LIGHT UP PRAYER HOUSE • FAMILY OUTREACH
          </span>
        </div>

        {/* Scripture Tagline */}
        <p className="text-sm font-serif italic text-amber-200/90 max-w-lg">
          &quot;Freely you have received; freely give.&quot; — Matthew 10:8
        </p>

        {/* Audit Verification Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Real-Time Evidence &amp; Financial Transparency System</span>
        </div>

        {/* Copyright */}
        <div className="text-xs text-purple-300/70 pt-2 border-t border-purple-900/80 w-full max-w-md">
          © 2026 — All Records Preserved and tracked in real-time for ministry leadership &amp; audit.
        </div>

      </div>
    </footer>
  );
};
