import React, { useState } from 'react';
import { Download, Share, PlusSquare, CheckCircle, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, canPromptDirectly, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already installed or dismissed, do not show
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleInstallClick = () => {
    if (canPromptDirectly) {
      install();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Guide non-iOS desktop/mobile where prompt event hasn't fired yet
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {/* Floating / Header Action Button */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-purple-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-amber-300"
          title="Install Light Up Prayer House app to your phone or desktop"
        >
          <Download className="w-3.5 h-3.5 fill-purple-950/20" />
          <span>Install App</span>
        </button>
      </div>

      {/* Guided Instructions Modal (iOS or browsers needing manual action) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md p-6 bg-gradient-to-b from-purple-950 to-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl text-slate-100">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-2 text-purple-300 hover:text-amber-300 rounded-full hover:bg-purple-900/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-cinzel text-amber-200">Install Light Up App</h3>
                <p className="text-xs text-purple-200">Add to your Home Screen for instant offline access</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-200 my-4 bg-purple-900/40 p-4 rounded-2xl border border-purple-800/60">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-purple-950 font-bold flex items-center justify-center text-xs">1</span>
                    <p className="pt-0.5">Tap the <strong>Share</strong> button <Share className="w-4 h-4 inline-block text-amber-400 mx-0.5" /> at the bottom or top of Safari.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-purple-950 font-bold flex items-center justify-center text-xs">2</span>
                    <p className="pt-0.5">Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong> <PlusSquare className="w-4 h-4 inline-block text-amber-400 mx-0.5" />.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-purple-950 font-bold flex items-center justify-center text-xs">3</span>
                    <p className="pt-0.5">Tap <strong>Add</strong> in the top right corner. The app will appear on your phone!</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-purple-950 font-bold flex items-center justify-center text-xs">1</span>
                    <p className="pt-0.5">Open this page directly in <strong>Google Chrome</strong> or <strong>Edge</strong> in its own full browser tab (outside any preview window).</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-purple-950 font-bold flex items-center justify-center text-xs">2</span>
                    <p className="pt-0.5">Click the <strong>Install icon</strong> in your browser address bar (or menu &gt; <em>Install Light Up Prayer House</em> / <em>Add to Home Screen</em>).</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-purple-950 font-bold flex items-center justify-center text-xs">3</span>
                    <p className="pt-0.5">Enjoy full offline attendance, offline database access, and instant launching!</p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-purple-950 font-bold text-xs hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-lg"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
