"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { LoiDocument } from "./LoiDocument";
import type { Offer, Property, Underwriting } from "@/lib/engine/types";

export default function PdfViewerInner({
  property,
  uw,
  offer,
  combineCash,
}: {
  property: Property;
  uw: Underwriting;
  offer: Offer;
  combineCash: boolean;
}) {
  return (
    <PDFViewer style={{ width: "100%", height: "100%", border: "none" }} showToolbar>
      <LoiDocument property={property} uw={uw} offer={offer} combineCash={combineCash} />
    </PDFViewer>
  );
}
