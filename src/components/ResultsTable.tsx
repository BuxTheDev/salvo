"use client";

import { fcS, fcT } from "@/lib/engine/format";
import type { Offer } from "@/lib/engine/types";
import type { RowResult } from "@/lib/engine/select";

function Badges({ r }: { r: RowResult }) {
  return (
    <span className="ml-2 inline-flex gap-1 align-middle">
      {r.dupCount > 1 && (
        <span className="rounded bg-steel/15 px-1.5 py-0.5 text-[10px] font-semibold text-steel">
          ×{r.dupCount}
        </span>
      )}
      {r.dnc && (
        <span className="rounded bg-loss/15 px-1.5 py-0.5 text-[10px] font-semibold text-loss">
          DNC
        </span>
      )}
    </span>
  );
}

function Status({ ready }: { ready: boolean }) {
  return ready ? (
    <span className="rounded-full bg-gain/10 px-2 py-0.5 text-[11px] font-medium text-gain">
      Ready
    </span>
  ) : (
    <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-2">
      Skip
    </span>
  );
}

function OfferBadges({ r }: { r: RowResult }) {
  return (
    <span className="inline-flex gap-1">
      {r.uw.creative_ok && (
        <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
          CR
        </span>
      )}
      {r.uw.cash_ok && (
        <span className="rounded bg-gain/15 px-1.5 py-0.5 text-[10px] font-semibold text-gain">
          CA
        </span>
      )}
    </span>
  );
}

export function ResultsTable({
  rows,
  offer,
  onPreview,
}: {
  rows: RowResult[];
  offer: Offer;
  onPreview: (r: RowResult) => void;
}) {
  const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-2";
  const td = "px-3 py-2 align-top";

  return (
    <div className="panel overflow-hidden">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-canvas">
            <tr className="border-b border-line">
              <th className={th}>Property / Contact</th>
              {offer === "creative" && (
                <>
                  <th className={th}>Rent vs Pmt</th>
                  <th className={th}>Down</th>
                  <th className={th}>SF Difference</th>
                </>
              )}
              {offer === "cash" && (
                <>
                  <th className={th}>Cash Offer</th>
                  <th className={th}>Net Cash</th>
                  <th className={th}>Saved</th>
                </>
              )}
              {offer === "both" && (
                <>
                  <th className={th}>SF Difference</th>
                  <th className={th}>Net Cash</th>
                  <th className={th}>Offers</th>
                </>
              )}
              <th className={th}>Status</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-line/60 hover:bg-canvas/60">
                <td className={td}>
                  <div className="font-medium">{r.property.address}</div>
                  <div className="text-xs text-ink-2">
                    {r.contact.name || "—"}
                    {r.contact.email ? ` · ${r.contact.email}` : ""}
                    <Badges r={r} />
                  </div>
                </td>

                {offer === "creative" && (
                  <>
                    <td className={`${td} tnum text-xs`}>
                      {fcT(r.property.monthly_rent)} <span className="text-ink-2">vs</span>{" "}
                      {fcT(r.uw.total)}
                    </td>
                    <td className={`${td} tnum`}>{fcT(r.uw.down)}</td>
                    <td className={`${td} tnum font-semibold text-gold`}>{fcT(r.uw.diff)}</td>
                  </>
                )}
                {offer === "cash" && (
                  <>
                    <td className={`${td} tnum`}>{fcT(r.uw.cash)}</td>
                    <td className={`${td} tnum font-semibold text-gain`}>{fcT(r.uw.net_cash)}</td>
                    <td className={`${td} tnum text-xs`}>{fcS(r.uw.net_trad)}</td>
                  </>
                )}
                {offer === "both" && (
                  <>
                    <td className={`${td} tnum font-semibold text-gold`}>{fcT(r.uw.diff)}</td>
                    <td className={`${td} tnum font-semibold text-gain`}>{fcT(r.uw.net_cash)}</td>
                    <td className={td}>
                      <OfferBadges r={r} />
                    </td>
                  </>
                )}

                <td className={td}>
                  <Status ready={r.ready} />
                </td>
                <td className={td}>
                  <button
                    type="button"
                    onClick={() => onPreview(r)}
                    className="text-xs text-steel hover:underline"
                  >
                    LOI
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
