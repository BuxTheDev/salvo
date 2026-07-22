"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RocketMark } from "./RocketMark";

const LINKS = [
  { href: "/import", label: "Import" },
  { href: "/offers", label: "Offers" },
];

export function HeaderNav() {
  const path = usePathname();
  return (
    <header className="sv-head">
      <div className="sv-brand">
        <RocketMark size={26} />
        <span className="sv-name">SALVO</span>
        <span className="sv-tag">fire the whole list</span>
      </div>
      <nav className="sv-nav">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={path?.startsWith(l.href) ? "on" : ""}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
