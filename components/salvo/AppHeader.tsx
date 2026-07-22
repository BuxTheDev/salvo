"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RocketMark } from "./RocketMark";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/import", label: "Import" },
  { href: "/offers", label: "Offers" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/templates", label: "Templates" },
  { href: "/presets", label: "Presets" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b-2 border-gold bg-ink text-white">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-8 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/offers" className="flex items-center gap-2">
          <RocketMark dark className="h-7 w-7" />
          <span className="wordmark font-mono-data text-sm font-semibold text-white">SALVO</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-white/10 text-white" : "text-white/60 hover:text-white/90",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <span className="hidden text-xs text-white/40 sm:block">fire the whole list.</span>
      </div>
    </header>
  );
}
