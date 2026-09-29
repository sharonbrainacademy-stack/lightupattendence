import React from 'react';
import { X, ShieldCheck, Download, ExternalLink } from 'lucide-react';

interface ProofModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ProofModal: React.FC<ProofModalProps> = ({ imageUrl, onClose }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `LightUp_Proof_Evidence_${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="relative max-w-3xl w-full rounded-3xl bg-purple-950 border-2 border-amber-500/40 p-5 sm:p-6 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-800/80 pb-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>Verifiable Airtime Transfer Evidence Proof</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-bold text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Proof</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer border border-rose-400"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>Close Preview</span>
            </button>
          </div>
        </div>

        {/* High Res Image Display */}
        <div className="rounded-2xl bg-black/60 p-2 border border-purple-800/60 max-h-[65vh] flex items-center justify-center overflow-auto">
          <img
            src={imageUrl}
            alt="Verifiable Transfer Evidence"
            className="max-h-[60vh] w-auto object-contain rounded-xl shadow-lg"
          />
        </div>

        {/* Footer info & bottom close */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-purple-300/80 pt-2 border-t border-purple-800/60">
          <div>Light Up Prayer House Family Outreach • Evidence preserved for audit transparency.</div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0"
          >
            <X className="w-4 h-4 stroke-[3]" />
            <span>Close Preview</span>
          </button>
        </div>
      </div>
    </div>
  );
};
