"use client";

type Accent = "steel" | "gold";

interface Option<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  label,
  accent,
  value,
  options,
  onChange,
}: {
  label: string;
  accent: Accent;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  const color = accent === "steel" ? "var(--steel)" : "var(--gold)";
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
        <span style={{ color }}>{label}</span>
      </div>
      <div className="inline-flex rounded-lg border border-line bg-canvas p-0.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              style={
                active
                  ? { background: color, color: "#fff" }
                  : { color: "var(--ink-2)", background: "transparent" }
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
