"use client";

import React, { useEffect, useState } from "react";
import {
  PropTechWorkspace,
  type WorkspaceProperty,
} from "@/components/biomimetic/prop-tech-workspace";

const DEMO_PROPERTIES: WorkspaceProperty[] = [
  {
    id: "willa-panorama-1",
    title: "Willa Panorama nad Jeziorem",
    location: "Borzygniew · Jezioro Mietkowskie",
    price: "2 450 000 zł",
    priceNumeric: 2450000,
    priceShort: "2,45 mln zł",
    area: 240,
    rooms: 6,
    orientation: "Południowy-Zachód",
    ecoScore: 97,
    imageUrl:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
    lat: 50.9642,
    lng: 16.6258,
  },
  {
    id: "willa-szczytnicki-2",
    title: "Apartament przy Parku Szczytnickim",
    location: "Wrocław · Biskupin",
    price: "1 680 000 zł",
    priceNumeric: 1680000,
    priceShort: "1,68 mln zł",
    area: 118,
    rooms: 4,
    orientation: "Południe",
    ecoScore: 93,
    imageUrl:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    lat: 51.1128,
    lng: 17.0894,
  },
  {
    id: "rezydencja-sleza-3",
    title: "Rezydencja u stóp Ślęży",
    location: "Sobótka · Masyw Ślęży",
    price: "3 150 000 zł",
    priceNumeric: 3150000,
    priceShort: "3,15 mln zł",
    area: 310,
    rooms: 7,
    orientation: "Południowy-Wschód",
    ecoScore: 96,
    imageUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    lat: 50.8981,
    lng: 16.7445,
  },
];

function formatPriceShort(val: number) {
  if (val >= 1000000) {
    return `${(val / 1000000).toFixed(2).replace(".", ",")} mln zł`;
  }
  return `${Math.round(val / 1000)} tys. zł`;
}

export default function DashboardBiomimeticPage() {
  const [properties, setProperties] = useState<WorkspaceProperty[]>(DEMO_PROPERTIES);

  useEffect(() => {
    let active = true;
    fetch("/api/properties", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const raw = Array.isArray(data) ? data : data.properties ?? [];
        if (raw.length === 0) return;

        const mapped: WorkspaceProperty[] = raw.map(
          (
            item: {
              id: string;
              title?: string;
              city?: string;
              address?: string;
              price?: number;
              area?: number;
              rooms?: number;
            },
            idx: number
          ) => {
            const numericPrice = Number(item.price) || 1450000;
            return {
              id: item.id,
              title: item.title || "Nieruchomość Willa Panorama",
              location: [item.city || "Wrocław", item.address].filter(Boolean).join(" · "),
              price: `${numericPrice.toLocaleString("pl-PL")} zł`,
              priceNumeric: numericPrice,
              priceShort: formatPriceShort(numericPrice),
              area: Number(item.area) || 120,
              rooms: Number(item.rooms) || 4,
              orientation: "Południowy-Zachód",
              ecoScore: 92 + (idx % 7),
              imageUrl: DEMO_PROPERTIES[idx % DEMO_PROPERTIES.length].imageUrl,
              lat: 51.1079 + (idx % 3) * 0.018 - 0.015,
              lng: 17.0385 + (idx % 4) * 0.022 - 0.02,
            };
          }
        );
        setProperties(mapped);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  return <PropTechWorkspace properties={properties} />;
}
