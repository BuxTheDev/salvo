import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles as s } from "./styles";
import { fcT, todayLong } from "@/lib/engine/format";
import { BUYER_ENTITY } from "@/lib/engine/constants";
import type { Property, UnderwriteResult } from "@/lib/engine/types";

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.cell}>
      <Text style={s.cellLabel}>{label}</Text>
      <Text style={s.cellValue}>{value}</Text>
    </View>
  );
}

export function CashLOIPage({ property, u }: { property: Property; u: UnderwriteResult }) {
  return (
    <Page size="LETTER" style={s.page}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.wordmark}>S A L V O</Text>
          <Text style={s.tagline}>fire the whole list.</Text>
        </View>
        <View>
          <Text style={s.docTitle}>Letter of Intent — Cash Offer</Text>
          <Text style={s.metaRight}>{todayLong()}</Text>
          <Text style={s.metaRight}>{property.address}</Text>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.paragraph}>To: {property.owner_full ?? property.agent_name ?? "Property Owner"}</Text>
        <Text style={s.paragraph}>
          Buyer ({BUYER_ENTITY}) is pleased to submit the following non-binding letter of intent to purchase the property at{" "}
          {property.address} for cash on the terms below.
        </Text>
      </View>

      <View style={s.headline}>
        <Text style={s.headlineLabel}>Net Cash to Seller</Text>
        <Text style={s.headlineValue}>{fcT(u.net_cash)}</Text>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Offer Terms</Text>
        <View style={s.grid}>
          <Cell label="Cash Purchase Price" value={fcT(u.cash)} />
          <Cell label="Net Cash to Seller" value={fcT(u.net_cash)} />
          <Cell label="Industry Selling Costs Avoided" value={fcT(u.industry_costs)} />
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Standard Terms</Text>
        <View style={s.clauseList}>
          <Text style={s.clauseItem}>• Buyer: {BUYER_ENTITY}</Text>
          <Text style={s.clauseItem}>• Inspection period: 14 days from acceptance.</Text>
          <Text style={s.clauseItem}>• Closing: within 30 days of acceptance, all-cash, no financing contingency.</Text>
          <Text style={s.clauseItem}>• Earnest money deposit: 1% of purchase price, held in escrow.</Text>
          <Text style={s.clauseItem}>• Agent compensation: up to 3%, paid by Buyer at closing where applicable.</Text>
          <Text style={s.clauseItem}>• Property conveyed as-is, where-is, with no warranties expressed or implied.</Text>
          <Text style={s.clauseItem}>• This letter is non-binding and does not constitute a contract; a formal purchase agreement will follow acceptance.</Text>
        </View>
      </View>

      <View style={s.footer}>
        <Text>Salvo · {BUYER_ENTITY} · This LOI is confidential and intended solely for the recipient.</Text>
      </View>
    </Page>
  );
}

export function CashLOI({ property, u }: { property: Property; u: UnderwriteResult }) {
  return (
    <Document title={`Salvo Cash LOI — ${property.address}`} author="Salvo">
      <CashLOIPage property={property} u={u} />
    </Document>
  );
}
