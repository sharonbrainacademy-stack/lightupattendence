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
              className="p-1.5 rounded-xl bg-purple-900/80 hover:bg-rose-500 text-purple-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* High Res Image Display */}
        <div className="rounded-2xl bg-black/60 p-2 border border-purple-800/60 max-h-[75vh] flex items-center justify-center overflow-auto">
          <img
            src={imageUrl}
            alt="Verifiable Transfer Evidence"
            className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg"
          />
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-purple-300/80">
          Light Up Prayer House Family Outreach • Evidence preserved for audit transparency.
        </div>
      </div>
    </div>
  );
};
