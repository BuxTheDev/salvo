import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import CreativeLOI from "../lib/loi/CreativeLOI.jsx";
import CashLOI from "../lib/loi/CashLOI.jsx";

/** Render one LOI to a PDF Buffer. `kind` "creative" produces the combined
 *  document (creative offer + appended cash); "cash" produces the standalone. */
export async function renderLOI(kind, d) {
  const element = kind === "creative"
    ? React.createElement(CreativeLOI, { d })
    : React.createElement(CashLOI, { d });
  return renderToBuffer(element);
}
