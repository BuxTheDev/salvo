"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RocketMark } from "./RocketMark";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/import", label: "Import" },
  { href: "/offers", label: "Offers" },
  { href: "/templates", label: "Templates" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { batch } = useStore();

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="app-frame mx-auto max-w-[1200px] overflow-hidden rounded-2xl bg-panel">
        {/* gunmetal header with 2px orange base rule */}
        <header className="border-b-2 border-gold bg-ink text-white">
          <div className="flex items-center justify-between px-5 py-3">
            <Link href="/offers" className="flex items-center gap-3">
              <RocketMark size={30} />
              <div className="leading-none">
                <div className="wordmark text-lg text-white">SALVO</div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-white/50">
                  fire the whole list
                </div>
              </div>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((n) => {
                const active = pathname === n.href || pathname.startsWith(n.href + "/");
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                      active ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          {batch && (
            <div className="flex items-center gap-3 bg-black/20 px-5 py-1.5 text-[11px] text-white/70">
              <span className="tnum">{batch.rowCount}</span> rows loaded from
              <span className="text-white/90">{batch.filename}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 uppercase tracking-wide">
                {batch.kind}
              </span>
            </div>
          )}
        </header>
        <main className="min-h-[70vh] p-5">{children}</main>
      </div>
      <p className="mx-auto mt-4 max-w-[1200px] px-1 text-center text-[11px] text-ink-2">
        Buyer entity on all offers: BrightPath Real Estate Solutions, LLC (and/or assigns)
      </p>
    </div>
  );
}
