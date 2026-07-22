"use client";

import { cn } from "@/lib/utils";
import type { Offer, Target } from "@/lib/engine/types";

const TARGETS: { value: Target; label: string }[] = [
  { value: "agent", label: "Direct-to-Agent" },
  { value: "seller", label: "Direct-to-Seller" },
];

const OFFERS: { value: Offer; label: string }[] = [
  { value: "creative", label: "Creative" },
  { value: "cash", label: "Cash" },
  { value: "both", label: "Both" },
];

/**
 * §10 — the two segmented controls are color-coded so the active pick pops
 * and the axes are distinguishable: Target = steel, Offer = orange (gold).
 */
export function ModeControls({
  target,
  offer,
  onTargetChange,
  onOfferChange,
}: {
  target: Target;
  offer: Offer;
  onTargetChange: (t: Target) => void;
  onOfferChange: (o: Offer) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Segmented
        label="Target"
        dotClassName="bg-steel"
        labelClassName="text-steel"
        value={target}
        options={TARGETS}
        onChange={onTargetChange}
        activeClassName="bg-steel text-white"
      />
      <Segmented
        label="Offer"
        dotClassName="bg-gold"
        labelClassName="text-gold"
        value={offer}
        options={OFFERS}
        onChange={onOfferChange}
        activeClassName="bg-gold text-white"
      />
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  dotClassName,
  labelClassName,
  activeClassName,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  dotClassName: string;
  labelClassName: string;
  activeClassName: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", labelClassName)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", dotClassName)} />
        {label}
      </span>
      <div className="flex items-center gap-1 rounded-lg border border-line bg-panel p-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              value === opt.value ? activeClassName : "text-ink-2 hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
