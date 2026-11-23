"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LiquidPriceSliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
}

export function LiquidPriceSlider({
  min = 300000,
  max = 5000000,
  step = 50000,
  value,
  onChange,
}: LiquidPriceSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const safeSpan = Math.max(1, max - min);
  const percentage = Math.min(100, Math.max(0, ((value - min) / safeSpan) * 100));

  const formatPrice = (val: number) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(2).replace(".", ",")} mln zł`;
    }
    return `${Math.round(val / 1000)} tys. zł`;
  };

  return (
    <div className="relative w-72 sm:w-80 pt-10 pb-1 select-none">
      <svg className="hidden" aria-hidden="true">
        <defs>
          <filter id="liquid-gooey-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="relative h-8 flex items-center" style={{ filter: "url(#liquid-gooey-filter)" }}>
        <div className="h-2.5 w-full rounded-full bg-emerald-950/15 dark:bg-emerald-400/15" />
        <div
          className="absolute left-0 h-2.5 rounded-full bg-emerald-700 dark:bg-emerald-400"
          style={{ width: `${percentage}%` }}
        />
        <motion.div
          animate={{ scale: isDragging ? 1.25 : 1 }}
          transition={{ type: "spring", stiffness: 450, damping: 22 }}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-emerald-800 dark:bg-emerald-300 shadow-md"
          style={{ left: `${percentage}%` }}
        />

        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ y: 0, scale: 0.4, opacity: 0 }}
              animate={{ y: -38, scale: 1, opacity: 1 }}
              exit={{ y: 0, scale: 0.3, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-9 w-24 rounded-full bg-emerald-800 dark:bg-emerald-300"
              style={{ left: `${percentage}%` }}
            />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ y: 8, opacity: 0, scale: 0.85 }}
            animate={{ y: -34, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 360, damping: 22 }}
            className="pointer-events-none absolute top-11 -translate-x-1/2 text-[11px] font-bold text-white dark:text-emerald-950 whitespace-nowrap"
            style={{ left: `${percentage}%` }}
          >
            {formatPrice(value)}
          </motion.div>
        )}
      </AnimatePresence>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        onPointerCancel={() => setIsDragging(false)}
        className="absolute inset-x-0 bottom-2 h-8 w-full cursor-pointer opacity-0"
        aria-label="Maksymalna cena nieruchomości"
      />

      <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] font-medium text-stone-500 dark:text-stone-400">
        <span>300 tys. zł</span>
        <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
          Do {formatPrice(value)}
        </span>
        <span>5 mln zł</span>
      </div>
    </div>
  );
}
