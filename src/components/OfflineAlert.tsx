import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WifiOff } from "lucide-react";
import { useWeather } from "../context/WeatherContext";

export const OfflineAlert: React.FC = () => {
  const { isOnline } = useWeather();
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineAlert(true);
    }
  }, [isOnline]);

  return (
    <AnimatePresence>
      {showOfflineAlert && !isOnline && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-sm bg-surface-container-low border border-black/5 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <WifiOff className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-on-surface mb-3 font-headline">Connection Lost</h2>
            <p className="text-sm text-on-surface-variant opacity-70 mb-8 leading-relaxed">
              It looks like you're offline. Please find a stable internet connection to refresh the buoy data.
            </p>
            <button
              onClick={() => setShowOfflineAlert(false)}
              className="w-full bg-on-surface text-surface font-bold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all"
            >
              OK
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
