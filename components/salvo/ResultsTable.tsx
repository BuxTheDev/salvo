"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fcT } from "@/lib/engine/format";
import type { OfferRow } from "@/lib/hooks/useOfferRows";
import type { Offer } from "@/lib/engine/types";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

function PropertyContactCell({ row }: { row: OfferRow }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <Link href={`/offers/${encodeURIComponent(row.property.address)}`} className="font-medium text-ink hover:text-steel hover:underline">
          {row.property.address}
        </Link>
        {row.listingsForContact > 1 && <Badge variant="steel">×{row.listingsForContact}</Badge>}
        {row.dnc && <Badge variant="loss">DNC</Badge>}
      </div>
      <span className="text-xs text-ink-2">
        {row.contact.name ?? "—"} {row.contact.email ? `· ${row.contact.email}` : ""} {row.contact.phone ? `· ${row.contact.phone}` : ""}
      </span>
    </div>
  );
}

function StatusBadge({ ready, reachable }: { ready: boolean; reachable: boolean }) {
  if (!ready) return <Badge variant="default">Not ready</Badge>;
  if (!reachable) return <Badge variant="warn">Ready · unreachable</Badge>;
  return <Badge variant="gain">Offer Ready</Badge>;
}

export function ResultsTable({
  rows,
  offer,
  selected,
  onToggle,
  onPreview,
}: {
  rows: OfferRow[];
  offer: Offer;
  selected: Set<string>;
  onToggle: (address: string) => void;
  onPreview: (row: OfferRow) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Property / Contact</TableHead>
          {offer === "creative" && (
            <>
              <TableHead>Rent vs Pmt</TableHead>
              <TableHead>Down</TableHead>
              <TableHead className="text-gold">SF Difference</TableHead>
            </>
          )}
          {offer === "cash" && (
            <>
              <TableHead>Cash Offer</TableHead>
              <TableHead className="text-gold">Net Cash</TableHead>
              <TableHead>Saved</TableHead>
            </>
          )}
          {offer === "both" && (
            <>
              <TableHead className="text-gold">SF Difference</TableHead>
              <TableHead className="text-gold">Net Cash</TableHead>
              <TableHead>Offers</TableHead>
            </>
          )}
          <TableHead>Status</TableHead>
          <TableHead className="text-right">LOI</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const u = row.underwrite;
          return (
            <TableRow key={row.property.address} data-state={selected.has(row.property.address) ? "selected" : undefined}>
              <TableCell>
                <Checkbox checked={selected.has(row.property.address)} onCheckedChange={() => onToggle(row.property.address)} />
              </TableCell>
              <TableCell className="max-w-xs whitespace-normal">
                <PropertyContactCell row={row} />
              </TableCell>

              {offer === "creative" && (
                <>
                  <TableCell className="font-mono-data text-xs">
                    {fcT(row.property.monthly_rent)} / {fcT(u.total)}
                  </TableCell>
                  <TableCell className="font-mono-data text-xs">{fcT(u.down)}</TableCell>
                  <TableCell className="font-mono-data font-semibold text-gain">{fcT(u.diff)}</TableCell>
                </>
              )}

              {offer === "cash" && (
                <>
                  <TableCell className="font-mono-data text-xs">{fcT(u.cash)}</TableCell>
                  <TableCell className="font-mono-data font-semibold text-gain">{fcT(u.net_cash)}</TableCell>
                  <TableCell className="font-mono-data text-xs">{fcT(u.industry_costs)}</TableCell>
                </>
              )}

              {offer === "both" && (
                <>
                  <TableCell className="font-mono-data font-semibold text-gain">{u.creative_ok ? fcT(u.diff) : "—"}</TableCell>
                  <TableCell className="font-mono-data font-semibold text-gain">{u.cash_ok ? fcT(u.net_cash) : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {u.creative_ok && <Badge variant="gold">CR</Badge>}
                      {u.cash_ok && <Badge variant="steel">CA</Badge>}
                    </div>
                  </TableCell>
                </>
              )}

              <TableCell>
                <StatusBadge ready={row.ready} reachable={row.reachable} />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onPreview(row)}>
                  <FileText /> Preview
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="py-10 text-center text-sm text-ink-2">
              No rows match the current mode / filters.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
