import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X, Share, Check } from "lucide-react";

export const InstallPrompt: React.FC = () => {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (ios) {
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) setShowInstallPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const dismissPrompt = () => {
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    setShowInstallPrompt(false);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {showInstallPrompt && (
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-24 left-4 right-4 z-[100]"
        >
          <div className="bg-surface-container-highest/90 backdrop-blur-2xl p-5 rounded-[2rem] shadow-2xl border border-black/5 dark:border-white/10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <Download className="text-white w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black text-on-surface uppercase tracking-tight">Install 2Lakes</h4>
              <p className="text-[11px] text-on-surface-variant font-medium leading-tight mt-0.5">
                {isIOS ? "Tap Share then 'Add to Home Screen'" : "Add to your home screen for the full experience"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isIOS && (
                <button 
                  onClick={handleInstallClick}
                  className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                >
                  Install
                </button>
              )}
              {isIOS && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Share className="w-4 h-4 text-primary" />
                </div>
              )}
              <button 
                onClick={dismissPrompt}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-on-surface-variant active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
