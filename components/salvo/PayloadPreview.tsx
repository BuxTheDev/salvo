"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildExportRows, exportColumns, type ExportRow } from "@/lib/engine/export";
import type { Offer, Target } from "@/lib/engine/types";

export function PayloadPreview({
  open,
  onOpenChange,
  rows,
  target,
  offer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: ExportRow[];
  target: Target;
  offer: Offer;
}) {
  const columns = exportColumns(offer);
  const data = buildExportRows(rows, target, offer);
  const preview = data.slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>GHL export preview</DialogTitle>
          <DialogDescription>
            {rows.length} row{rows.length === 1 ? "" : "s"} selected · showing the first {preview.length}. This is exactly what ships in
            the CSV / GHL API push.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-md border border-line">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c} className="font-mono-data text-xs">
                      {row[c]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
