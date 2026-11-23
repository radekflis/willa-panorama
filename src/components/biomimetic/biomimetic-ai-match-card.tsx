"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Sun, VolumeX, Trees, Train, Wifi, CheckCircle2 } from "lucide-react";

interface MatchMetric {
  id: string;
  label: string;
  propertyScore: number;
  userWeight: number;
  icon: React.ElementType;
}

const INITIAL_METRICS: MatchMetric[] = [
  { id: "light", label: "Nasłonecznienie", propertyScore: 95, userWeight: 90, icon: Sun },
  { id: "quiet", label: "Cisza akustyczna", propertyScore: 88, userWeight: 85, icon: VolumeX },
  { id: "nature", label: "Bliskość zieleni", propertyScore: 92, userWeight: 95, icon: Trees },
  { id: "transit", label: "Komunikacja", propertyScore: 76, userWeight: 60, icon: Train },
  { id: "remote", label: "Praca zdalna", propertyScore: 90, userWeight: 80, icon: Wifi },
];

export function BiomimeticAIMatchCard({
  propertyTitle = "Willa nad wodą i zielenią",
  onBookTour,
}: {
  propertyTitle?: string;
  onBookTour?: () => void;
}) {
  const [metrics, setMetrics] = useState<MatchMetric[]>(INITIAL_METRICS);

  const totalWeight = metrics.reduce((acc, m) => acc + m.userWeight, 0) || 1;
  const matchPercentage = Math.round(
    metrics.reduce((acc, m) => acc + m.propertyScore * m.userWeight, 0) / totalWeight
  );

  const handleWeightChange = (id: string, newWeight: number) => {
    setMetrics((prev) =>
      prev.map((m) => (m.id === id ? { ...m, userWeight: newWeight } : m))
    );
  };

  const size = 300;
  const center = size / 2;
  const maxRadius = 105;

  const getCoordinates = (values: number[]) =>
    values.map((val, i) => {
      const angle = (Math.PI * 2 * i) / values.length - Math.PI / 2;
      const r = (val / 100) * maxRadius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      };
    });

  const buildOrganicPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    const len = points.length;
    let d = "";
    for (let i = 0; i < len; i++) {
      const p0 = points[(i - 1 + len) % len];
      const p1 = points[i];
      const p2 = points[(i + 1) % len];
      const p3 = points[(i + 2) % len];
      const cp1x = p1.x + (p2.x - p0.x) * 0.2;
      const cp1y = p1.y + (p2.y - p0.y) * 0.2;
      const cp2x = p2.x - (p3.x - p1.x) * 0.2;
      const cp2y = p2.y - (p3.y - p1.y) * 0.2;
      if (i === 0) d += `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} `;
      d += `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} `;
    }
    return d + "Z";
  };

  const propertyPoints = getCoordinates(metrics.map((m) => m.propertyScore));
  const userPoints = getCoordinates(metrics.map((m) => m.userWeight));
  const propertyPath = buildOrganicPath(propertyPoints);
  const userPath = buildOrganicPath(userPoints);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="w-full max-w-4xl rounded-[36px] p-6 md:p-8
                 bg-white/80 dark:bg-emerald-950/65
                 backdrop-blur-2xl backdrop-saturate-150
                 border border-white/85 dark:border-emerald-400/20
                 shadow-[0_20px_50px_rgba(16,42,35,0.12)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200/60 dark:border-emerald-800/40 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/10 dark:bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Analiza Biomimetyczna AI</span>
          </div>
          <h2 className="mt-2 text-xl md:text-2xl font-bold text-stone-900 dark:text-white">
            {propertyTitle}
          </h2>
        </div>

        <motion.div
          key={matchPercentage}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className="flex items-center gap-3 rounded-[24px] bg-emerald-900 dark:bg-emerald-400 px-5 py-3 text-white dark:text-emerald-950 shadow-lg shadow-emerald-900/20"
        >
          <div>
            <div className="text-[11px] font-medium opacity-85">Zgodność profilu</div>
            <div className="text-2xl font-extrabold leading-none">{matchPercentage}%</div>
          </div>
          <CheckCircle2 className="h-7 w-7 opacity-90" />
        </motion.div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="relative flex flex-col items-center justify-center rounded-[28px] bg-[#F5F3EE]/85 dark:bg-[#071612]/85 p-4 border border-stone-200/60 dark:border-emerald-800/30">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px] overflow-visible">
            <defs>
              <radialGradient id="bioCellGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.15" />
              </radialGradient>
            </defs>

            {[0.35, 0.68, 1].map((scale, idx) => (
              <circle
                key={idx}
                cx={center}
                cy={center}
                r={maxRadius * scale}
                fill="none"
                stroke="currentColor"
                strokeDasharray="3 4"
                className="text-stone-300 dark:text-emerald-800/60"
              />
            ))}

            {metrics.map((m, i) => {
              const angle = (Math.PI * 2 * i) / metrics.length - Math.PI / 2;
              const endX = center + maxRadius * Math.cos(angle);
              const endY = center + maxRadius * Math.sin(angle);
              const labelX = center + (maxRadius + 24) * Math.cos(angle);
              const labelY = center + (maxRadius + 24) * Math.sin(angle);
              return (
                <g key={m.id}>
                  <line
                    x1={center}
                    y1={center}
                    x2={endX}
                    y2={endY}
                    stroke="currentColor"
                    className="text-stone-300/70 dark:text-emerald-800/50"
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-stone-600 dark:fill-emerald-200/80 text-[10px] font-semibold"
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}

            <motion.path
              d={propertyPath}
              fill="url(#bioCellGradient)"
              stroke="#10b981"
              strokeWidth="2.5"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "150px 150px" }}
            />

            <motion.path
              animate={{ d: userPath }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              fill="rgba(245, 158, 11, 0.15)"
              stroke="#d97706"
              strokeWidth="2"
              strokeDasharray="5 3"
            />

            {propertyPoints.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="4"
                className="fill-emerald-700 dark:fill-emerald-300 stroke-white dark:stroke-emerald-950"
                strokeWidth="1.5"
              />
            ))}
          </svg>

          <div className="mt-2 flex items-center gap-5 text-[11px] font-medium text-stone-600 dark:text-stone-300">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Parametry oferty
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-dashed border-amber-600 bg-amber-500/30" />
              Twoje priorytety
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Dostosuj wagę czynników — wykres na żywo przelicza dopasowanie:
          </p>

          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium text-stone-700 dark:text-stone-200">
                  <span className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                    {metric.label}
                  </span>
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                    {metric.userWeight}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={metric.userWeight}
                  onChange={(e) => handleWeightChange(metric.id, Number(e.target.value))}
                  className="w-full accent-emerald-700 cursor-pointer"
                  aria-label={metric.label}
                />
              </div>
            );
          })}

          {onBookTour && (
            <button
              type="button"
              onClick={onBookTour}
              className="mt-2 w-full rounded-2xl bg-emerald-800 hover:bg-emerald-700 py-3 text-xs font-semibold text-white shadow-md transition-colors"
            >
              Umów prezentację na podstawie dopasowania
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
