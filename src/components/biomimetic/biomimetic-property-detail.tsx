"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sun, Sunrise, Sunset, Compass, Calendar, X } from "lucide-react";
import { NearbyInsights } from "./nearby-insights";

export interface PropertyDetailData {
  id: string;
  title: string;
  location: string;
  price: string;
  area: number;
  rooms: number;
  orientation?: string;
  ecoScore?: number;
  lat?: number;
  lng?: number;
}

export function BiomimeticPropertyDetail({
  property,
  onClose,
}: {
  property: PropertyDetailData;
  onClose: () => void;
}) {
  const [hour, setHour] = useState<number>(13.5);
  const [booked, setBooked] = useState(false);

  const progress = (hour - 6) / 14;
  const sunX = 15 + progress * 70;
  const sunY = 85 - Math.sin(progress * Math.PI) * 65;

  const getSunlightGradient = (h: number) => {
    if (h < 9) {
      return "radial-gradient(circle at var(--sun-x) var(--sun-y), rgba(186, 230, 253, 0.75) 0%, rgba(167, 243, 208, 0.25) 45%, transparent 75%)";
    }
    if (h < 16.5) {
      return "radial-gradient(circle at var(--sun-x) var(--sun-y), rgba(254, 240, 138, 0.85) 0%, rgba(253, 224, 71, 0.3) 50%, transparent 80%)";
    }
    return "radial-gradient(circle at var(--sun-x) var(--sun-y), rgba(251, 146, 60, 0.8) 0%, rgba(244, 63, 94, 0.25) 45%, transparent 75%)";
  };

  const formatTime = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      layoutId={`property-card-${property.id}`}
      onClick={(e) => e.stopPropagation()}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="relative w-full max-w-4xl overflow-hidden rounded-[36px] bg-[#FAF8F5]/95 dark:bg-[#091915]/95 p-6 md:p-8 backdrop-blur-2xl border border-white/80 dark:border-emerald-500/20 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Compass className="h-4 w-4" />
            <span>Ekspozycja okien: {property.orientation || "Południowy-Zachód"}</span>
          </div>
          <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            {property.title}
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">{property.location}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200/70 dark:bg-white/10 text-stone-700 dark:text-stone-200 transition-transform hover:scale-105 active:scale-95"
          aria-label="Zamknij szczegóły"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="relative lg:col-span-2 h-80 overflow-hidden rounded-[28px] bg-[#EFECE6] dark:bg-[#0D241E] border border-stone-200/80 dark:border-emerald-800/40 p-6 flex items-center justify-center"
          style={
            {
              "--sun-x": `${sunX}%`,
              "--sun-y": `${sunY}%`,
            } as React.CSSProperties
          }
        >
          <svg
            viewBox="0 0 400 260"
            className="h-full w-full max-w-md stroke-stone-700 dark:stroke-emerald-200/70 fill-white/60 dark:fill-emerald-950/50"
            strokeWidth="2.5"
          >
            <rect x="40" y="30" width="320" height="200" rx="16" />
            <line x1="180" y1="30" x2="180" y2="140" />
            <line x1="40" y1="140" x2="130" y2="140" />
            <line x1="250" y1="130" x2="360" y2="130" />
            <line x1="70" y1="230" x2="290" y2="230" stroke="#10b981" strokeWidth="5" />
            <line x1="360" y1="50" x2="360" y2="115" stroke="#10b981" strokeWidth="5" />
            <text x="85" y="90" className="fill-stone-500 text-[10px] stroke-none font-medium">
              Sypialnia
            </text>
            <text x="235" y="85" className="fill-stone-500 text-[10px] stroke-none font-medium">
              Gabinet
            </text>
            <text x="175" y="190" className="fill-stone-700 text-[12px] stroke-none font-semibold">
              Salon z tarasem
            </text>
          </svg>

          <div
            className="pointer-events-none absolute inset-0 transition-all duration-150 mix-blend-multiply dark:mix-blend-screen"
            style={{ background: getSunlightGradient(hour) }}
          />

          <motion.div
            animate={{ left: `${sunX}%`, top: `${sunY}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-[0_0_25px_rgba(251,191,36,0.9)]"
          >
            <Sun className="h-5 w-5" />
          </motion.div>

          <div className="absolute bottom-3 inset-x-4 rounded-2xl bg-white/85 dark:bg-emerald-950/85 px-4 py-2.5 backdrop-blur-md border border-white/70 dark:border-emerald-500/20 flex items-center gap-3">
            <Sunrise className="h-4 w-4 text-amber-600 shrink-0" />
            <input
              type="range"
              min={6}
              max={20}
              step={0.25}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-full accent-emerald-700 cursor-pointer"
              aria-label="Symulacja godziny nasłonecznienia"
            />
            <Sunset className="h-4 w-4 text-orange-600 shrink-0" />
            <span className="ml-1 w-12 text-right text-xs font-bold tabular-nums text-stone-900 dark:text-white">
              {formatTime(hour)}
            </span>
          </div>
          {property.lat != null && property.lng != null && <NearbyInsights lat={property.lat} lng={property.lng} />}
        </div>

        <div className="flex flex-col justify-between rounded-[28px] bg-white/75 dark:bg-emerald-950/45 p-5 border border-stone-200/60 dark:border-emerald-800/30">
          <div>
            <span className="text-xs font-medium text-stone-500">Cena ofertowa</span>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">
              {property.price}
            </div>

            <div className="mt-4 space-y-2.5 text-xs text-stone-600 dark:text-stone-300">
              <div className="flex justify-between py-1.5 border-b border-stone-200/50 dark:border-white/10">
                <span>Powierzchnia</span>
                <span className="font-semibold">{property.area} m²</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-200/50 dark:border-white/10">
                <span>Liczba pokoi</span>
                <span className="font-semibold">{property.rooms}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Komfort świetlny (Bio-Index)</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {property.ecoScore ?? 94}/100
                </span>
              </div>
            </div>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setBooked(true)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-800 hover:bg-emerald-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            <span>{booked ? "Zgłoszono wizytę" : "Umów prezentację na żywo"}</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
