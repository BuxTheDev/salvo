"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2 } from "lucide-react";
import { CreativeLOI } from "@/components/pdf/CreativeLOI";
import { CashLOI } from "@/components/pdf/CashLOI";
import type { OfferRow } from "@/lib/hooks/useOfferRows";

type LoiKind = "creative" | "cash";

function slug(address: string) {
  return address.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Keyed by `row.property.address` from the parent so each new deal gets a
 * fresh instance — that's how `kind` picks up its correct initial value
 * without resetting state from inside an effect.
 */
function LOIPreviewBody({ row }: { row: OfferRow }) {
  const [kind, setKind] = useState<LoiKind>(row.underwrite.creative_ok ? "creative" : "cash");
  const [rendered, setRendered] = useState<{ kind: LoiKind; url: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const doc =
      kind === "creative" ? <CreativeLOI property={row.property} u={row.underwrite} /> : <CashLOI property={row.property} u={row.underwrite} />;

    pdf(doc)
      .toBlob()
      .then((blob) => {
        if (cancelled) return;
        setRendered({ kind, url: URL.createObjectURL(blob) });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `row` is fixed for this component's lifetime (it's keyed by address).
  }, [kind]);

  useEffect(() => {
    const urlToRevoke = rendered?.url;
    return () => {
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [rendered?.url]);

  const loading = !rendered || rendered.kind !== kind;
  const url = !loading ? rendered!.url : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>LOI preview — {row.property.address}</DialogTitle>
        <DialogDescription>Rendered exactly as it will be sent. Choose which offer to preview.</DialogDescription>
      </DialogHeader>

      <Tabs value={kind} onValueChange={(v) => setKind(v as LoiKind)}>
        <TabsList>
          <TabsTrigger value="creative" disabled={!row.underwrite.creative_ok}>
            Creative
          </TabsTrigger>
          <TabsTrigger value="cash" disabled={!row.underwrite.cash_ok}>
            Cash
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex h-[60vh] items-center justify-center overflow-hidden rounded-md border border-line bg-canvas">
        {loading || !url ? <Loader2 className="h-6 w-6 animate-spin text-ink-2" /> : <iframe title="LOI preview" src={url} className="h-full w-full" />}
      </div>

      <DialogFooter>
        <Button asChild disabled={!url}>
          <a href={url ?? undefined} download={`${slug(row.property.address)}-${kind}-loi.pdf`}>
            <Download /> Download PDF
          </a>
        </Button>
      </DialogFooter>
    </>
  );
}

export function LOIPreview({ row, open, onOpenChange }: { row: OfferRow | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">{row && <LOIPreviewBody key={row.property.address} row={row} />}</DialogContent>
    </Dialog>
  );
}
