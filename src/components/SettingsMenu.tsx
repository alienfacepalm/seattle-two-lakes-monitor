import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Layout, Zap, Moon, Sun, RefreshCw, Radar, FileText, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleDark: (val: boolean) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  hasRadar: boolean;
  onShowRadar: () => void;
}

export const SettingsMenu = ({ 
  isOpen, 
  onClose, 
  isDark,
  onToggleDark,
  onRefresh,
  isRefreshing,
  hasRadar,
  onShowRadar,
}: SettingsMenuProps) => {
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

            <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-180px)] no-scrollbar">
              {/* Appearance Section */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4 ml-1">Appearance</h3>
                
                <div className="space-y-3">
                  {/* Dark Mode */}
                  <button 
                    onClick={() => onToggleDark(!isDark)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border bg-surface-container-low border-black/5 dark:border-white/10 hover:bg-surface-container transition-all`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-on-surface">
                        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-on-surface uppercase tracking-tight leading-none mb-1">{isDark ? 'Light' : 'Dark'} Mode</p>
                        <p className="text-[10px] font-bold text-on-surface-variant leading-none">Toggle theme</p>
                      </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${isDark ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'}`}>
                      <motion.div 
                        animate={{ x: isDark ? 22 : 2 }}
                        className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full"
                      />
                    </div>
                  </button>
                </div>
              </section>

              {/* Tools Section */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4 ml-1">Tools</h3>
                <div className="space-y-3">
                  {/* Refresh */}
                  <button 
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low border border-black/5 dark:border-white/10 hover:bg-surface-container transition-all group active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-on-surface group-hover:text-primary transition-colors">
                      <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-on-surface uppercase tracking-tight leading-none mb-1">Refresh Data</p>
                      <p className="text-[10px] font-bold text-on-surface-variant leading-none">Sync with buoy sensors</p>
                    </div>
                  </button>

                  {/* Radar (if available) */}
                  {hasRadar && (
                    <button 
                      onClick={() => { onShowRadar(); onClose(); }}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low border border-black/5 dark:border-white/10 hover:bg-surface-container transition-all group active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-on-surface group-hover:text-primary transition-colors">
                        <Radar className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-on-surface uppercase tracking-tight leading-none mb-1">Live Radar</p>
                        <p className="text-[10px] font-bold text-on-surface-variant leading-none">View precipitation maps</p>
                      </div>
                    </button>
                  )}
                </div>
              </section>

              {/* Legal Section */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4 ml-1">Legal</h3>
                <Link 
                  to="/tos"
                  onClick={onClose}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface-container-low border border-black/5 dark:border-white/10 hover:bg-surface-container transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-on-surface group-hover:text-primary transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-on-surface uppercase tracking-tight leading-none mb-1">Terms of Service</p>
                      <p className="text-[10px] font-bold text-on-surface-variant leading-none">Usage & Data attribution</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-on-surface-variant/40" />
                </Link>
              </section>

              <div className="pt-8 mt-8 border-t border-black/5 dark:border-white/10">
                <p className="text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-40 italic">
                  2lakes.app v1.3 • Seattle, WA
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
