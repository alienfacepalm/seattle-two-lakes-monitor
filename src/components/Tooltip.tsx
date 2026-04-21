import React from "react";
import * as RadarTooltip from "@radix-ui/react-tooltip";
import { motion, AnimatePresence } from "motion/react";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content, side = "top", align = "center" }) => {
  return (
    <RadarTooltip.Provider delayDuration={200}>
      <RadarTooltip.Root>
        <RadarTooltip.Trigger asChild>
          {children}
        </RadarTooltip.Trigger>
        <RadarTooltip.Portal>
          <RadarTooltip.Content
            side={side}
            align={align}
            sideOffset={8}
            asChild
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="z-[200] max-w-[240px] rounded-xl bg-surface-container-highest/90 backdrop-blur-xl px-3 py-2 text-xs font-bold text-on-surface shadow-2xl border border-black/5 dark:border-white/10 select-none animate-in fade-in zoom-in-95"
            >
              {content}
              <RadarTooltip.Arrow className="fill-surface-container-highest/90" />
            </motion.div>
          </RadarTooltip.Content>
        </RadarTooltip.Portal>
      </RadarTooltip.Root>
    </RadarTooltip.Provider>
  );
};
