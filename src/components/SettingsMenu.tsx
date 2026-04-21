import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Layout, Zap } from "lucide-react";

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isBasicMode: boolean;
  onToggleBasicMode: (val: boolean) => void;
}

export const SettingsMenu = ({ isOpen, onClose, isBasicMode, onToggleBasicMode }: SettingsMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100]"
          />
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-surface rounded-l-[2.5rem] z-[110] shadow-2xl p-8 border-l border-black/5 dark:border-white/10"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-on-surface uppercase tracking-tight">Settings</h2>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                id="close-settings"
              >
                <X className="w-6 h-6 text-on-surface" />
              </button>
            </div>

            <div className="space-y-6">
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4 ml-1">Appearance</h3>
                
                <button 
                  onClick={() => onToggleBasicMode(!isBasicMode)}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${
                    isBasicMode 
                    ? 'bg-primary/10 border-primary/20 ring-1 ring-primary/20' 
                    : 'bg-surface-container-low border-black/5 dark:border-white/10 hover:bg-surface-container'
                  }`}
                  id="toggle-basic-mode"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      isBasicMode ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface-container-highest text-on-surface'
                    }`}>
                      {isBasicMode ? <Zap className="w-6 h-6" /> : <Layout className="w-6 h-6" />}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-on-surface uppercase tracking-tight">Basic Mode</p>
                      <p className="text-xs font-bold text-on-surface-variant leading-tight">High contrast, minimal info</p>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${isBasicMode ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}`}>
                    <motion.div 
                      animate={{ x: isBasicMode ? 26 : 2 }}
                      className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </div>
                </button>
              </section>

              <div className="pt-8 mt-8 border-t border-black/5 dark:border-white/10">
                <p className="text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">
                  More settings coming soon
                </p>
              </div>
            </div>
            
            <div className="absolute bottom-10 left-8 right-8">
              <button 
                onClick={onClose}
                className="w-full py-4 bg-on-surface text-surface-container font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] transition-transform active:scale-95"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
