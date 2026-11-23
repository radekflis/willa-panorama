"use client";

import React, { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  MotionValue,
} from "framer-motion";
import { Map, LayoutGrid, Heart, Sparkles } from "lucide-react";

export type WorkspaceView = "map" | "grid" | "saved" | "ai-match";

interface BiomimeticFloatingDockProps {
  activeView: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  savedCount?: number;
}

interface DockItemConfig {
  id: WorkspaceView;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export function BiomimeticFloatingDock({
  activeView,
  onViewChange,
  savedCount = 0,
}: BiomimeticFloatingDockProps) {
  const mouseX = useMotionValue(Infinity);

  const items: DockItemConfig[] = [
    { id: "map", label: "Mapa", icon: Map },
    { id: "grid", label: "Katalog", icon: LayoutGrid },
    { id: "ai-match", label: "Bio-Dopasowanie", icon: Sparkles },
    { id: "saved", label: "Zapisane", icon: Heart, badge: savedCount },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <motion.nav
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        aria-label="Główna nawigacja widoku"
        className="flex items-center gap-2 rounded-full px-3 py-2.5
                   bg-white/80 dark:bg-emerald-950/70
                   backdrop-blur-2xl backdrop-saturate-150
                   border border-white/85 dark:border-emerald-400/25
                   shadow-[0_14px_40px_rgba(16,42,35,0.14),inset_0_1px_1px_rgba(255,255,255,0.9)]"
      >
        {items.map((item) => (
          <DockItem
            key={item.id}
            item={item}
            mouseX={mouseX}
            isActive={activeView === item.id}
            onClick={() => onViewChange(item.id)}
          />
        ))}
      </motion.nav>
    </div>
  );
}

function DockItem({
  item,
  mouseX,
  isActive,
  onClick,
}: {
  item: DockItemConfig;
  mouseX: MotionValue<number>;
  isActive: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const Icon = item.icon;

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const scaleSync = useTransform(distance, [-120, 0, 120], [1, 1.18, 1]);
  const scale = useSpring(scaleSync, {
    mass: 0.15,
    stiffness: 240,
    damping: 16,
  });

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onClick}
      style={{ scale }}
      whileTap={{ scale: 0.92 }}
      className={`relative flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-colors duration-300 ${
        isActive
          ? "text-white dark:text-emerald-950"
          : "text-stone-700 dark:text-stone-200 hover:text-stone-950 dark:hover:text-white"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="biomimetic-active-dock-pill"
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className="absolute inset-0 -z-10 rounded-full bg-emerald-800 dark:bg-emerald-300 shadow-[0_4px_16px_rgba(16,185,129,0.35)]"
        />
      )}

      <Icon className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{item.label}</span>

      {typeof item.badge === "number" && item.badge > 0 && (
        <span
          className={`ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
            isActive
              ? "bg-white/25 text-white dark:bg-emerald-950/20 dark:text-emerald-950"
              : "bg-emerald-800/10 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200"
          }`}
        >
          {item.badge}
        </span>
      )}
    </motion.button>
  );
}
