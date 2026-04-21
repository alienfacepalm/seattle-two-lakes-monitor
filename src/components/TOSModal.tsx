import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ShieldAlert, FileText, ExternalLink } from "lucide-react";

interface TOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TOSModal: React.FC<TOSModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-8">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
            className="relative w-full max-w-2xl max-h-[85vh] bg-surface-container-low border border-black/10 dark:border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 dark:border-white/5 bg-surface/50 backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-on-surface uppercase tracking-tight leading-none">
                    Terms of <span className="text-primary italic">Service</span>
                  </h3>
                  <p className="text-[10px] text-on-surface-variant opacity-60 font-bold uppercase tracking-widest mt-1">
                    Last Updated: April 2026
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors group cursor-pointer"
              >
                <X className="w-6 h-6 text-on-surface-variant group-hover:text-on-surface transition-colors" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              {/* Beta Warning Section */}
              <section className="bg-primary/5 border border-primary/20 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldAlert className="w-6 h-6 text-primary" />
                  <h4 className="text-sm font-black text-on-surface uppercase tracking-[0.1em]">BETA PHASE NOTICE</h4>
                </div>
                <p className="text-xs font-semibold leading-relaxed text-on-surface-variant italic">
                  2lakes.app is currently in Beta. This application is provided for informational and entertainment purposes only. Data is collected from public NOAA sensors which may go offline or transmit inaccurate readings. Do not rely on this application for safety-critical decisions.
                </p>
              </section>

              <div className="space-y-6">
                <section className="space-y-3">
                  <h4 className="text-xs font-black text-on-surface uppercase tracking-widest border-b border-black/5 dark:border-white/5 pb-2">1. Acceptance of Terms</h4>
                  <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
                    By accessing or using 2lakes.app, you agree to be bound by these Terms of Service. If you do not agree to all of the terms and conditions, you may not access the service.
                  </p>
                </section>

                <section className="space-y-3">
                  <h4 className="text-xs font-black text-on-surface uppercase tracking-widest border-b border-black/5 dark:border-white/5 pb-2">2. Accuracy of Data</h4>
                  <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
                    We do not warrant the accuracy, completeness, or usefulness of this information. Any reliance you place on such information is strictly at your own risk. Water conditions change rapidly; always verify conditions locally before entering the water.
                  </p>
                </section>

                <section className="space-y-3">
                  <h4 className="text-xs font-black text-on-surface uppercase tracking-widest border-b border-black/5 dark:border-white/5 pb-2">3. Free Geo Maps</h4>
                  <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
                    Map data is provided via free geo-mapping services (including Yandex/NOAA). We use these services as they are free and accessible. This integration is strictly technical and does not imply any political affiliation or "coup"—it's just free stuff we couldn't find for free elsewhere.
                  </p>
                </section>

                <section className="space-y-3">
                  <h4 className="text-xs font-black text-on-surface uppercase tracking-widest border-b border-black/5 dark:border-white/5 pb-2">4. Limitation of Liability</h4>
                  <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
                    In no event will the developers or associates of 2lakes.app be liable for damages of any kind, under any legal theory, arising out of or in connection with your use, or inability to use, the website.
                  </p>
                </section>
              </div>

              <div className="pt-8 text-center border-t border-black/5 dark:border-white/5">
                <p className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-[0.2em]">
                  Seattle, Washington
                </p>
              </div>
            </div>

            <div className="px-8 py-6 bg-surface/30 backdrop-blur-xl border-t border-black/5 dark:border-white/5 shrink-0">
              <button 
                onClick={onClose}
                className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                I Understand
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
