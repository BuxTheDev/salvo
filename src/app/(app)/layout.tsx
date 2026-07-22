"use client";

import { SalvoProvider } from "@/lib/store";
import { AppHeader } from "@/components/salvo/AppHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SalvoProvider>
      <div className="min-h-screen flex flex-col app-frame">
        <AppHeader />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">{children}</main>
      </div>
    </SalvoProvider>
  );
}
