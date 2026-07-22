"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RocketMark } from "./RocketMark";

const NAV = [
  { href: "/import", label: "Import" },
  { href: "/offers", label: "Offers" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/templates", label: "Templates" },
  { href: "/presets", label: "Presets" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-full flex flex-col">
      <header
        className="sticky top-0 z-40 text-white"
        style={{
          background: "var(--ink)",
          boxShadow: "inset 0 -2px 0 var(--gold)",
        }}
      >
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 flex items-center gap-6 h-14">
          <Link href="/offers" className="flex items-center gap-2.5 shrink-0">
            <RocketMark size={26} />
            <span className="wordmark text-sm tracking-[0.22em]">Salvo</span>
          </Link>
          <p className="hidden md:block text-xs text-white/45 -ml-2">
            fire the whole list.
          </p>
          <nav className="ml-auto flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    active
                      ? "text-white"
                      : "text-white/50 hover:text-white/85"
                  }`}
                  style={
                    active
                      ? { boxShadow: "inset 0 -2px 0 var(--gold)" }
                      : undefined
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-6">
        <div
          className="min-h-[calc(100vh-5.5rem)] panel"
          style={{ boxShadow: "var(--shadow-outer)" }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
