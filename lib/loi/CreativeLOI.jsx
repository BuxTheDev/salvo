import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { styles as s } from "./theme.js";
import { CreativeSection, CashSection } from "./parts.jsx";

/**
 * Creative LOI (Subject-To + Seller Finance). Matches the BrightPath Creative
 * template, which appends the Cash offer as a second document (SALVO_BUILD.md
 * §7.1). Set `combined={false}` to send the creative offer on its own.
 * `d` is a merge-field object from buildExportRow() with offer="creative"
 * (which includes both creative and cash fields).
 */
export default function CreativeLOI({ d, combined = true }) {
  return (
    <Document title={`Creative LOI — ${d.Address}`} author="Salvo">
      <Page size="LETTER" style={s.page} wrap>
        <CreativeSection d={d} />
      </Page>
      {combined && (
        <Page size="LETTER" style={s.page} wrap>
          <CashSection d={d} compensationLabel="COMPENSATION:" compensationValue="Buyer to pay agent up to 3% compensation." />
        </Page>
      )}
    </Document>
  );
}
