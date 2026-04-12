import React from "react";
import { motion } from "motion/react";
import { getConditionIcon } from "./Icons";

export const IconGallery: React.FC = () => {
  const conditions = ["Warm", "Moderate", "Cold", "Cloudy", "Overcast", "Windy", "Rainy", "Showers", "Unknown"];
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      <div className="bg-surface-container-low rounded-[2rem] p-8 shadow-sm border border-black/5 dark:border-white/5">
        <h2 className="text-2xl font-black text-on-surface mb-2 font-headline uppercase tracking-tight">Condition Icons</h2>
        <p className="text-sm text-on-surface-variant opacity-70 mb-8">A gallery of all possible weather condition icons used in the app.</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {conditions.map(c => (
            <div key={c} className="bg-surface-container-highest/50 rounded-2xl p-6 flex flex-col items-center gap-4 border border-black/5 dark:border-white/5">
              <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center shadow-inner">
                {getConditionIcon(c)}
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-on-surface">{c}</p>
                <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] mt-1 opacity-60">Icon Preview</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
