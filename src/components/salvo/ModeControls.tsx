"use client";

import { cn } from "@/lib/utils";
import type { OfferMode, Target } from "@/lib/engine";

interface ModeControlsProps {
  target: Target;
  mode: OfferMode;
  onTargetChange: (t: Target) => void;
  onModeChange: (m: OfferMode) => void;
}

function Segment<T extends string>({
  label,
  color,
  options,
  value,
  onChange,
}: {
  label: string;
  color: "steel" | "gold";
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className={cn("text-xs font-medium mb-1.5 flex items-center gap-1.5", color === "steel" ? "text-steel" : "text-gold")}>
        <span className={cn("w-2 h-2 rounded-full", color === "steel" ? "bg-steel" : "bg-gold")} />
        {label}
      </div>
      <div className="inline-flex rounded-lg border border-line bg-panel p-1 panel-shadow">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              value === opt.value
                ? color === "steel"
                  ? "bg-steel text-white"
                  : "bg-gold text-white"
                : "text-ink-2 hover:text-ink"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ModeControls({ target, mode, onTargetChange, onModeChange }: ModeControlsProps) {
  return (
    <div className="flex flex-wrap gap-6">
      <Segment
        label="Target"
        color="steel"
        options={[
          { value: "agent" as Target, label: "Agent" },
          { value: "seller" as Target, label: "Seller" },
        ]}
        value={target}
        onChange={onTargetChange}
      />
      <Segment
        label="Offer"
        color="gold"
        options={[
          { value: "creative" as OfferMode, label: "Creative" },
          { value: "cash" as OfferMode, label: "Cash" },
          { value: "both" as OfferMode, label: "Both" },
        ]}
        value={mode}
        onChange={onModeChange}
      />
    </div>
  );
}
