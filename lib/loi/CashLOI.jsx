import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import { styles as s } from "./theme.js";
import { CashSection } from "./parts.jsx";

/**
 * Standalone Cash LOI. Matches the BrightPath Cash template (SALVO_BUILD.md §7.2).
 * `d` is a merge-field object from buildExportRow() with offer="cash".
 */
export default function CashLOI({ d }) {
  return (
    <Document title={`Cash LOI — ${d.Address}`} author="Salvo">
      <Page size="LETTER" style={s.page} wrap>
        <CashSection d={d} />
      </Page>
    </Document>
  );
}
