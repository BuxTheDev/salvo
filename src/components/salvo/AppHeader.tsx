function RocketMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <circle cx="16" cy="14" r="10" stroke="#e86a2a" strokeWidth="2.5" fill="none" strokeDasharray="50 13" transform="rotate(-30 16 14)" />
      <path d="M16 6 L20 14 L16 13 L12 14 Z" fill="white" stroke="#1b2228" strokeWidth="1" />
      <path d="M13 18 Q16 22 19 18" stroke="#1b2228" strokeWidth="1.5" fill="none" />
      <ellipse cx="16" cy="26" rx="6" ry="2" fill="#1b2228" opacity="0.3" />
    </svg>
  );
}

export function AppHeader() {
  return (
    <header className="bg-ink text-white border-b-2 border-gold">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RocketMark className="w-8 h-8" />
          <div>
            <h1 className="wordmark text-lg font-bold tracking-widest">SALVO</h1>
            <p className="text-xs text-white/60">fire the whole list</p>
          </div>
        </div>
        <nav className="flex gap-1 text-sm">
          <a href="/import" className="px-3 py-1.5 rounded hover:bg-white/10 transition-colors">
            Import
          </a>
          <a href="/offers" className="px-3 py-1.5 rounded hover:bg-white/10 transition-colors">
            Offers
          </a>
        </nav>
      </div>
    </header>
  );
}
