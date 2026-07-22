"use client";
/** Mode-aware results table with dup ×N + DNC badges (spec §6, §11). */
import { fmtPhone, usd } from "@/lib/engine/format";
import { isDncFlagged, isReachable } from "@/lib/engine/score";
import { TARGETS } from "@/lib/engine/export";
import type { ScoredRow } from "@/lib/engine/types";
import { useSalvo } from "@/lib/store";

export function ResultsTable({ scored }: { scored: ScoredRow[] }) {
  const { target, offer, reachableOnly, sel, toggleSel } = useSalvo();
  const bothMode = offer === "both";

  return (
    <div className="sv-tablewrap">
      <table className="sv-table">
        <thead>
          {offer === "creative" ? (
            <tr><th></th><th className="l">Property / {TARGETS[target]}</th><th>Rent vs Pmt</th><th>Down</th><th className="hook">SF Difference</th><th>Status</th></tr>
          ) : offer === "cash" ? (
            <tr><th></th><th className="l">Property / {TARGETS[target]}</th><th>Cash Offer</th><th className="hook">Net Cash</th><th>Saved</th><th>Status</th></tr>
          ) : (
            <tr><th></th><th className="l">Property / {TARGETS[target]}</th><th className="hook">SF Difference</th><th className="hook">Net Cash</th><th>Offers</th><th>Status</th></tr>
          )}
        </thead>
        <tbody>
          {scored.map((x) => {
            const { r, u, creativeOK, cashOK, ready: ok, contact, dup } = x;
            if (reachableOnly && ok && !isReachable(x)) return null;
            const dncFlag = isDncFlagged(x);
            return (
              <tr key={r.address} className={`${sel.has(r.address) ? "on" : ""} ${ok ? "" : "dim"}`}>
                <td>
                  <input type="checkbox" disabled={!ok} checked={sel.has(r.address)} onChange={() => toggleSel(r.address)} />
                </td>
                <td className="l">
                  <div className="sv-addr">
                    {r.address} <span className="sv-city">{r.city}{r.city && r.state ? ", " : ""}{r.state}</span>
                    {dup > 1 && <span className="sv-dup" title="same contact on multiple listings">×{dup}</span>}
                    {dncFlag && <span className="sv-dnc">DNC</span>}
                  </div>
                  <div className="sv-contact">
                    {contact.name || "no contact"}
                    {contact.viaAgent && target === "seller" ? " (agent fallback)" : ""}
                    {contact.email ? ` · ${contact.email}` : contact.phone ? ` · ${fmtPhone(contact.phone)}` : " · no contact"}
                  </div>
                </td>
                {offer === "creative" && (
                  <>
                    <td>
                      <span className={creativeOK ? "gain" : "loss"}>{r.monthly_rent == null ? "—" : usd(r.monthly_rent)}</span>
                      <span className="mut"> / {usd(u.total)}</span>
                    </td>
                    <td>{u.down == null ? <span className="warn">TBD</span> : usd(u.down)}</td>
                    <td className="hook">{(u.diff ?? 0) > 0 ? usd(u.diff) : "—"}</td>
                  </>
                )}
                {offer === "cash" && (
                  <>
                    <td>{usd(u.cash)}</td>
                    <td className={`hook ${(u.net_cash ?? 0) < 0 ? "loss" : ""}`}>{usd(u.net_cash)}</td>
                    <td>{usd(u.industry_costs)}</td>
                  </>
                )}
                {bothMode && (
                  <>
                    <td className="hook">{creativeOK && (u.diff ?? 0) > 0 ? usd(u.diff) : "—"}</td>
                    <td className={`hook ${(u.net_cash ?? 0) < 0 ? "loss" : ""}`}>{cashOK ? usd(u.net_cash) : "—"}</td>
                    <td>
                      <span className="sv-offers">
                        <span className={`ob ${creativeOK ? "on" : ""}`}>CR</span>
                        <span className={`ob ${cashOK ? "on" : ""}`}>CA</span>
                      </span>
                    </td>
                  </>
                )}
                <td><span className={`chip ${ok ? "ok" : "no"}`}>{ok ? "READY" : "SKIP"}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
