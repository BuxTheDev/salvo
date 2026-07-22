"use client";

import {
  FileUp,
  Gauge,
  History,
  Layers3,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function RocketMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 42 42" aria-hidden="true">
      <circle cx="21" cy="19" r="15" fill="none" stroke="#e86a2a" strokeWidth="4" strokeDasharray="72 23" transform="rotate(48 21 19)" />
      <path d="M21 5c5 5 7.5 10.5 7.5 17.5L21 30l-7.5-7.5C13.5 15.5 16 10 21 5Z" fill="#f6f3ed" />
      <path d="M21 10v13l4-3.5" fill="none" stroke="#1b2228" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 29l-3 7 7-3 7 3-3-7" fill="#e86a2a" />
    </svg>
  );
}

const navigation = [
  { href: "/import", label: "Smart import", icon: FileUp },
  { href: "/offers", label: "Offer console", icon: Gauge },
];

const future = [
  { label: "Campaigns", icon: History },
  { label: "Templates", icon: Layers3 },
  { label: "Presets", icon: SlidersHorizontal },
  { label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <RocketMark />
          <div>
            <div className="wordmark">SALVO</div>
            <div className="tagline">fire the whole list.</div>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${pathname.startsWith(href) ? "active" : ""}`}
            >
              <Icon size={15} strokeWidth={1.8} />
              {label}
            </Link>
          ))}
          <div className="nav-label">MANAGE</div>
          {future.map(({ label, icon: Icon }) => (
            <span key={label} className="nav-link" style={{ opacity: 0.48 }}>
              <Icon size={15} strokeWidth={1.8} />
              {label}
              <span className="badge" style={{ marginLeft: "auto", fontSize: 7 }}>soon</span>
            </span>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="entity">BrightPath Real Estate<br />Solutions, LLC</div>
          <div className="user-row">
            <div className="avatar">BP</div>
            <div><strong>Acquisitions</strong><br /><span style={{ color: "#7f8991" }}>Admin workspace</span></div>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="crumb">BrightPath / <strong>{pathname.includes("offers") ? "Offers" : "Import"}</strong></div>
          <div className="top-actions">
            <div className="status-pill"><span className="status-dot" /> ENGINE READY</div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
