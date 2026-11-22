import React from "react";
import { EditionProvider } from "@/components/edition-provider";
import { BiomimeticShell } from "@/components/biomimetic-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <EditionProvider>
      <BiomimeticShell>{children}</BiomimeticShell>
    </EditionProvider>
  );
}
