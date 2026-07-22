"use client";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  cashMergeFields,
  creativeMergeFields,
  CREATIVE_CONSTANTS,
} from "@/lib/engine/loi";
import type { Offer, Property, Underwriting } from "@/lib/engine/types";

const c = {
  ink: "#1b2228",
  ink2: "#4a5560",
  line: "#d6dbe0",
  gold: "#e86a2a",
  gain: "#147a54",
};

const s = StyleSheet.create({
  page: { padding: 48, fontSize: 10, color: c.ink, fontFamily: "Helvetica", lineHeight: 1.5 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: c.gold,
    paddingBottom: 8,
    marginBottom: 16,
  },
  wordmark: { fontSize: 18, fontFamily: "Helvetica-Bold", letterSpacing: 3, color: c.ink },
  tagline: { fontSize: 7, color: c.ink2, letterSpacing: 1, marginTop: 2 },
  buyer: { fontSize: 8, color: c.ink2, textAlign: "right", maxWidth: 200 },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  sub: { fontSize: 9, color: c.ink2, marginBottom: 14 },
  para: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: c.gold,
    marginBottom: 6,
    marginTop: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: c.line,
    paddingVertical: 3,
  },
  label: { color: c.ink2 },
  value: { fontFamily: "Helvetica-Bold" },
  highlight: {
    backgroundColor: "#fdf1ea",
    borderLeftWidth: 3,
    borderLeftColor: c.gold,
    padding: 8,
    marginVertical: 10,
  },
  highlightLabel: { fontSize: 8, color: c.ink2, textTransform: "uppercase", letterSpacing: 1 },
  highlightValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: c.gold },
  terms: { fontSize: 8, color: c.ink2, marginTop: 4 },
  sign: { marginTop: 28, flexDirection: "row", justifyContent: "space-between" },
  signBox: { width: "45%", borderTopWidth: 0.5, borderTopColor: c.ink, paddingTop: 4, fontSize: 8 },
});

function Head() {
  return (
    <View style={s.header}>
      <View>
        <Text style={s.wordmark}>SALVO</Text>
        <Text style={s.tagline}>FIRE THE WHOLE LIST</Text>
      </View>
      <Text style={s.buyer}>{CREATIVE_CONSTANTS.buyer}</Text>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

function CreativePage({ p, uw }: { p: Property; uw: Underwriting }) {
  const f = creativeMergeFields(p, uw);
  return (
    <Page size="LETTER" style={s.page}>
      <Head />
      <Text style={s.title}>Letter of Intent — Seller Finance / Subject-To</Text>
      <Text style={s.sub}>{f.Date}</Text>

      <Text style={s.para}>
        Dear {f["Owner Full Name"] || "Property Owner"}, {CREATIVE_CONSTANTS.buyer} is pleased to
        submit this non-binding Letter of Intent to purchase the property located at{" "}
        <Text style={s.value}>{f.Address}</Text> under the creative-finance terms outlined below.
      </Text>

      <View style={s.highlight}>
        <Text style={s.highlightLabel}>The Seller Finance Difference</Text>
        <Text style={s.highlightValue}>{f["Seller Profit Difference"]}</Text>
        <Text style={s.terms}>
          Estimated additional net proceeds vs. a traditional MLS sale after ~
          {CREATIVE_CONSTANTS.agentCompPct === 3 ? "12" : "12"}% selling costs.
        </Text>
      </View>

      <Text style={s.sectionTitle}>Offer Terms</Text>
      <Line label="Purchase Price" value={f.Price} />
      <Line label="Existing Loan Balance" value={f["Loan Balance"]} />
      <Line label="Down Payment" value={f.Down} />
      <Line label="Seller-Financed Amount" value={f.Financed} />
      <Line label="Monthly Payment to Seller" value={f.Payment} />
      <Line label="Existing Loan Payment (via servicer)" value={f["Sub Payment"]} />
      <Line label="Interest" value={CREATIVE_CONSTANTS.interest} />
      <Line label="Balloon" value={CREATIVE_CONSTANTS.balloon} />

      <Text style={s.sectionTitle}>Seller Net Comparison</Text>
      <Line label="Seller Profit — Creative Sale" value={f["Seller Profit Creative"]} />
      <Line label="Seller Profit — Traditional Sale" value={f["Seller Profit Traditional"]} />
      <Line label="Industry Selling Costs Avoided" value={f["Industry Costs"]} />
      <Line label="Estimated Home Value" value={f["Home Value"]} />

      <Text style={s.terms}>
        Standard terms: {CREATIVE_CONSTANTS.inspectionDays}-day inspection period,{" "}
        {CREATIVE_CONSTANTS.closeDays}-day close, {CREATIVE_CONSTANTS.emdPct}% earnest money
        deposit, up to {CREATIVE_CONSTANTS.agentCompPct}% agent compensation, property purchased
        as-is. This LOI is non-binding and subject to a definitive purchase agreement.
      </Text>

      <View style={s.sign}>
        <View style={s.signBox}>
          <Text>Buyer — {CREATIVE_CONSTANTS.buyer}</Text>
        </View>
        <View style={s.signBox}>
          <Text>Seller — {f["Owner Full Name"] || ""}</Text>
        </View>
      </View>
    </Page>
  );
}

function CashPage({ p, uw }: { p: Property; uw: Underwriting }) {
  const f = cashMergeFields(p, uw);
  return (
    <Page size="LETTER" style={s.page}>
      <Head />
      <Text style={s.title}>Letter of Intent — Cash Offer</Text>
      <Text style={s.sub}>{f.Date}</Text>

      <Text style={s.para}>
        Dear {f["Owner Full Name"] || "Property Owner"}, {CREATIVE_CONSTANTS.buyer} is pleased to
        submit this non-binding all-cash Letter of Intent for the property located at{" "}
        <Text style={s.value}>{f.Address}</Text>.
      </Text>

      <View style={s.highlight}>
        <Text style={s.highlightLabel}>Cash Purchase Price</Text>
        <Text style={[s.highlightValue, { color: c.gain }]}>{f["Cash Scenario"]}</Text>
      </View>

      <Text style={s.sectionTitle}>Offer Terms</Text>
      <Line label="Cash Purchase Price" value={f["Cash Scenario"]} />
      <Line label="Estimated Net to Seller" value={f["Net Cash"]} />
      <Line label="Industry Selling Costs Avoided" value={f["Industry Costs"]} />

      <Text style={s.terms}>
        Standard terms: {CREATIVE_CONSTANTS.inspectionDays}-day inspection period,{" "}
        {CREATIVE_CONSTANTS.closeDays}-day close, {CREATIVE_CONSTANTS.emdPct}% earnest money
        deposit, property purchased as-is. This LOI is non-binding and subject to a definitive
        purchase agreement.
      </Text>

      <View style={s.sign}>
        <View style={s.signBox}>
          <Text>Buyer — {CREATIVE_CONSTANTS.buyer}</Text>
        </View>
        <View style={s.signBox}>
          <Text>Seller — {f["Owner Full Name"] || ""}</Text>
        </View>
      </View>
    </Page>
  );
}

/**
 * The Salvo LOI document. Creative sends include the cash page as a second page
 * (matching the current .docx behavior); this is configurable via `combineCash`.
 */
export function LoiDocument({
  property,
  uw,
  offer,
  combineCash = true,
}: {
  property: Property;
  uw: Underwriting;
  offer: Offer;
  combineCash?: boolean;
}) {
  const showCreative = offer !== "cash";
  const showCash = offer === "cash" || combineCash;
  return (
    <Document title={`Salvo LOI — ${property.address}`}>
      {showCreative && <CreativePage p={property} uw={uw} />}
      {showCash && <CashPage p={property} uw={uw} />}
    </Document>
  );
}

/** A single Document containing LOIs for many properties (batch "Generate PDF"). */
export function BulkLoiDocument({
  items,
  offer,
  combineCash = true,
}: {
  items: { property: Property; uw: Underwriting }[];
  offer: Offer;
  combineCash?: boolean;
}) {
  const showCreative = offer !== "cash";
  const showCash = offer === "cash" || combineCash;
  return (
    <Document title={`Salvo LOIs — ${items.length} properties`}>
      {items.flatMap(({ property, uw }, i) => {
        const pages = [];
        if (showCreative) pages.push(<CreativePage key={`cr-${i}`} p={property} uw={uw} />);
        if (showCash) pages.push(<CashPage key={`ca-${i}`} p={property} uw={uw} />);
        return pages;
      })}
    </Document>
  );
}
