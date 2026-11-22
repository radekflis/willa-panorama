"use client";

import React from "react";

export function BiomimeticLiquidLayer() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 18% 22%, rgba(168, 198, 255, 0.55) 0%, rgba(255,255,255,0) 48%)," +
          "radial-gradient(circle at 82% 20%, rgba(255, 196, 178, 0.55) 0%, rgba(255,255,255,0) 50%)," +
          "radial-gradient(circle at 76% 82%, rgba(214, 182, 255, 0.50) 0%, rgba(255,255,255,0) 52%)," +
          "linear-gradient(135deg, #F6F7FC 0%, #FDF7F4 52%, #F3F5FD 100%)",
      }}
    >
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <defs>
          <radialGradient id="lgAuraA" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.42" />
            <stop offset="55%" stopColor="#E9D5FF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lgAuraB" cx="65%" cy="55%" r="62%">
            <stop offset="0%" stopColor="#FDBA74" stopOpacity="0.38" />
            <stop offset="55%" stopColor="#F9A8D4" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        <path fill="url(#lgAuraA)">
          <animate
            attributeName="d"
            dur="16s"
            repeatCount="indefinite"
            values="
              M220,160 C430,40 760,90 880,270 C1000,450 810,720 540,730 C270,740 90,540 120,330 C138,225 170,190 220,160 Z;
              M310,120 C570,60 880,170 940,380 C1000,590 750,780 460,740 C170,700 80,470 150,270 C188,175 245,140 310,120 Z;
              M220,160 C430,40 760,90 880,270 C1000,450 810,720 540,730 C270,740 90,540 120,330 C138,225 170,190 220,160 Z
            "
          />
        </path>

        <path fill="url(#lgAuraB)">
          <animate
            attributeName="d"
            dur="20s"
            repeatCount="indefinite"
            values="
              M880,210 C1120,230 1290,430 1220,650 C1150,870 840,850 660,690 C480,530 550,290 720,225 C780,202 830,206 880,210 Z;
              M790,260 C1030,180 1260,330 1250,560 C1240,790 940,880 710,760 C480,640 490,390 650,295 C700,265 745,275 790,260 Z;
              M880,210 C1120,230 1290,430 1220,650 C1150,870 840,850 660,690 C480,530 550,290 720,225 C780,202 830,206 880,210 Z
            "
          />
        </path>
      </svg>
    </div>
  );
}
