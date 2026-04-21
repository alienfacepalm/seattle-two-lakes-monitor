import React from "react";
import { TEMP_SCALE } from "../lib/utils";
import { Tooltip } from "./Tooltip";
import { motion } from "motion/react";

export const TempLegend = ({ unit = "F" }: { unit?: "F" | "C" }) => {
  return (
    <div className="flex items-center gap-1.5 p-2 bg-surface-container/50 backdrop-blur-md rounded-xl border border-black/5 dark:border-white/5">
      <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mr-1">Scale</span>
      <div className="flex items-center gap-1">
        {TEMP_SCALE.map((step, idx) => {
          const formatVal = (v: number) => {
            if (v === -Infinity || v === Infinity) return "";
            return unit === "F" ? Math.round(v) : Math.round((v - 32) * 5 / 9);
          };

          const label = step.min === -Infinity 
            ? `< ${formatVal(step.max)}°` 
            : step.max > 120 
              ? `> ${formatVal(step.min)}°`
              : `${formatVal(step.min)}-${formatVal(step.max)}°`;

          return (
            <Tooltip key={idx} content={
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-tighter text-white opacity-60">Temp Range</span>
                <span className="text-sm font-black text-white">{label}</span>
              </div>
            }>
              <motion.div 
                whileHover={{ scale: 1.2, y: -2 }}
                className={`w-3 h-3 rounded-full ${step.bg} cursor-help shadow-sm border border-white/10`}
              />
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};
