"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { underwrite } from "@/lib/engine/underwrite";
import { DEFAULT_SETTINGS, type Offer, type Property } from "@/lib/engine/types";
import { Segmented } from "./Segmented";

const PdfViewerInner = dynamic(() => import("./loi/PdfViewerInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-ink-2">Rendering PDF…</div>
  ),
});

const SAMPLE: Property = {
  address: "2847 E Turney Ave, Phoenix, AZ 85016",
  city: "Phoenix",
  state: "AZ",
  home_value: 425000,
  loan_balance: 210000,
  monthly_rent: 2650,
  loan_payment: 1180,
  owner_full: "Marcus & Elena Vega",
};

export function TemplatesPreview() {
  const [offer, setOffer] = useState<Offer>("creative");
  const uw = underwrite(SAMPLE, DEFAULT_SETTINGS);

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <h2 className="text-lg font-semibold">LOI Templates</h2>
          <p className="text-sm text-ink-2">
            Live preview against a sample deal. These render every merge field into the BrightPath
            layout.
          </p>
        </div>
        <Segmented
          label="Offer"
          accent="gold"
          value={offer}
          onChange={setOffer}
          options={[
            { value: "creative", label: "Creative" },
            { value: "cash", label: "Cash" },
            { value: "both", label: "Both" },
          ]}
        />
      </div>
      <div className="panel h-[75vh] overflow-hidden">
        <PdfViewerInner property={SAMPLE} uw={uw} offer={offer} combineCash={offer !== "cash"} />
      </div>
    </div>
  );
}
