"use client";

import { Badge } from "@/components/ui/badge";
import { fcT } from "@/lib/engine";
import type { OfferMode, QualifiedRow } from "@/lib/engine";

interface ResultsTableProps {
  rows: QualifiedRow[];
  mode: OfferMode;
  selected: Set<string>;
  onToggle: (address: string) => void;
  onSelectAll: () => void;
}

export function ResultsTable({
  rows,
  mode,
  selected,
  onToggle,
  onSelectAll,
}: ResultsTableProps) {
  const readyRows = rows.filter((r) => r.ready);

  return (
    <div className="bg-panel rounded-lg border border-line panel-shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <h3 className="text-sm font-semibold">Results</h3>
        <button onClick={onSelectAll} className="text-xs text-steel hover:underline">
          Select all ready ({readyRows.length})
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas/50 text-left text-xs text-ink-2">
              <th className="p-3 w-8" />
              <th className="p-3">Property / Contact</th>
              {mode === "creative" && (
                <>
                  <th className="p-3">Rent vs Pmt</th>
                  <th className="p-3">Down</th>
                  <th className="p-3">SF Difference</th>
                </>
              )}
              {mode === "cash" && (
                <>
                  <th className="p-3">Cash Offer</th>
                  <th className="p-3">Net Cash</th>
                </>
              )}
              {mode === "both" && (
                <>
                  <th className="p-3">SF Difference</th>
                  <th className="p-3">Net Cash</th>
                  <th className="p-3">Offers</th>
                </>
              )}
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-ink-2">
                  Import a property list to get started.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const { property, underwrite: u, contact, ready, reachable, dupCount } = row;
              const addr = property.address;
              const isDnc =
                property.owner_dnc && !contact.viaAgent && !contact.email;

              return (
                <tr
                  key={addr}
                  className={`border-b border-line last:border-0 ${ready ? "" : "opacity-50"}`}
                >
                  <td className="p-3">
                    {ready && (
                      <input
                        type="checkbox"
                        checked={selected.has(addr)}
                        onChange={() => onToggle(addr)}
                        className="rounded border-line"
                      />
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{addr}</div>
                    <div className="text-xs text-ink-2">
                      {contact.name ?? "—"} · {contact.email ?? contact.phone ?? "no contact"}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {dupCount > 1 && <Badge variant="steel">×{dupCount}</Badge>}
                      {isDnc && <Badge variant="warn">DNC</Badge>}
                      {!reachable && <Badge variant="loss">Unreachable</Badge>}
                    </div>
                  </td>

                  {mode === "creative" && (
                    <>
                      <td className="p-3 mono-data text-xs">
                        {property.monthly_rent != null ? fcT(property.monthly_rent) : "—"} /{" "}
                        {fcT(u.total)}
                      </td>
                      <td className="p-3 mono-data">{fcT(u.down)}</td>
                      <td className="p-3 mono-data text-gold font-medium">{fcT(u.diff)}</td>
                    </>
                  )}
                  {mode === "cash" && (
                    <>
                      <td className="p-3 mono-data">{fcT(u.cash)}</td>
                      <td className="p-3 mono-data text-gain font-medium">{fcT(u.net_cash)}</td>
                    </>
                  )}
                  {mode === "both" && (
                    <>
                      <td className="p-3 mono-data text-gold">{u.creative_ok ? fcT(u.diff) : "—"}</td>
                      <td className="p-3 mono-data text-gain">{u.cash_ok ? fcT(u.net_cash) : "—"}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {u.creative_ok && <Badge variant="gold">CR</Badge>}
                          {u.cash_ok && <Badge variant="gain">CA</Badge>}
                        </div>
                      </td>
                    </>
                  )}

                  <td className="p-3">
                    {ready ? (
                      <Badge variant="gain">Ready</Badge>
                    ) : (
                      <Badge>Skip</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
