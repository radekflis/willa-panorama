"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Edition = "buyer" | "owner" | "agency";

type EditionCtx = {
  edition: Edition;
  setEdition: (e: Edition) => void;
};

const Ctx = createContext<EditionCtx>({
  edition: "owner",
  setEdition: () => {},
});

export function EditionProvider({ children }: { children: React.ReactNode }) {
  const [edition, setEditionState] = useState<Edition>("owner");

  useEffect(() => {
    const saved = window.localStorage.getItem("willa_edition") as Edition | null;
    if (saved === "buyer" || saved === "owner" || saved === "agency") {
      setEditionState(saved);
    }
  }, []);

  function setEdition(next: Edition) {
    setEditionState(next);
    window.localStorage.setItem("willa_edition", next);
  }

  return <Ctx.Provider value={{ edition, setEdition }}>{children}</Ctx.Provider>;
}

export function useEdition() {
  return useContext(Ctx);
}
