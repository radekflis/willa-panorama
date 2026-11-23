"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Maximize2, MapPin, Sparkles } from "lucide-react";

export interface PropertyCardProps {
  id: string;
  title: string;
  location: string;
  price: string;
  area: number;
  rooms: number;
  imageUrl: string;
  ecoScore?: number;
  onSelect: (id: string) => void;
  onHoverChange?: (id: string | null) => void;
}

export function BiomimeticPropertyCard({
  id,
  title,
  location,
  price,
  area,
  rooms,
  imageUrl,
  ecoScore = 94,
  onSelect,
  onHoverChange,
}: PropertyCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <motion.div
      layoutId={`property-card-${id}`}
      onClick={() => onSelect(id)}
      onMouseEnter={() => onHoverChange?.(id)}
      onMouseLeave={() => onHoverChange?.(null)}
      whileHover={{ y: -6, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 22,
        mass: 0.8,
      }}
      className="group relative cursor-pointer overflow-hidden rounded-[32px] p-3 transition-shadow duration-500
                 bg-white/70 dark:bg-emerald-950/45
                 backdrop-blur-2xl backdrop-saturate-150
                 border border-white/75 dark:border-emerald-400/20
                 shadow-[0_8px_32px_rgba(16,42,35,0.08),inset_0_1px_1px_rgba(255,255,255,0.85)]
                 hover:shadow-[0_20px_48px_rgba(16,185,129,0.16),inset_0_1px_2px_rgba(255,255,255,0.95)]"
    >
      <div className="pointer-events-none absolute -inset-12 -z-10 rounded-full bg-gradient-to-tr from-emerald-300/20 via-teal-200/10 to-amber-200/20 opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100" />

      <div className="relative h-52 w-full overflow-hidden rounded-[24px] bg-stone-200/60">
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md border border-white/25">
          <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
          <span>Bio-Index {ecoScore}%</span>
        </div>

        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
          whileTap={{ scale: 0.75 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
          aria-label="Polub ofertę"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-stone-800 backdrop-blur-md border border-white/85 shadow-sm transition-colors hover:bg-white"
        >
          <Heart
            className={`h-4 w-4 transition-colors duration-300 ${
              isLiked ? "fill-rose-500 text-rose-500" : "text-stone-700"
            }`}
          />
        </motion.button>
      </div>

      <div className="mt-4 px-2 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              {title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500 dark:text-emerald-200/70">
              <MapPin className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              {location}
            </p>
          </div>

          <span className="rounded-2xl bg-emerald-950/5 dark:bg-emerald-400/10 px-3 py-1.5 text-sm font-bold text-emerald-900 dark:text-emerald-300 whitespace-nowrap">
            {price}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-stone-200/60 dark:border-emerald-800/40 pt-3 text-xs font-medium text-stone-600 dark:text-stone-300">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/85 dark:bg-white/5 px-3 py-1 border border-stone-200/50 dark:border-white/10">
              {area} m²
            </span>
            <span className="rounded-full bg-white/85 dark:bg-white/5 px-3 py-1 border border-stone-200/50 dark:border-white/10">
              {rooms} pok.
            </span>
          </div>

          <span className="flex items-center gap-1 text-emerald-800 dark:text-emerald-400 opacity-75 transition-opacity duration-300 group-hover:opacity-100">
            Podgląd <Maximize2 className="h-3 w-3" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
