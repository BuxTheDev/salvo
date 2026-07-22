"use client";
/** Target × Offer segmented controls — color-coded steel / orange (spec §10). */
import { useSalvo } from "@/lib/store";
import { OFFERS, TARGETS } from "@/lib/engine/export";
import type { Offer, Target } from "@/lib/engine/types";

export function ModeControls() {
  const { target, offer, reachableOnly, setTarget, setOffer, setReachableOnly } = useSalvo();
  return (
    <div className="sv-bar">
      <div className="sv-controls">
        <div className="sv-seg seg-target">
          <span className="sv-seglbl">Target</span>
          {(Object.keys(TARGETS) as Target[]).map((t) => (
            <button key={t} className={target === t ? "on" : ""} onClick={() => setTarget(t)}>
              {TARGETS[t]}
            </button>
          ))}
        </div>
        <div className="sv-seg seg-offer">
          <span className="sv-seglbl">Offer</span>
          {(Object.keys(OFFERS) as Offer[]).map((o) => (
            <button key={o} className={offer === o ? "on" : ""} onClick={() => setOffer(o)}>
              {OFFERS[o]}
            </button>
          ))}
        </div>
      </div>
      <label className="sv-reach">
        <input type="checkbox" checked={reachableOnly} onChange={(e) => setReachableOnly(e.target.checked)} />
        Reachable only
      </label>
    </div>
  );
}
