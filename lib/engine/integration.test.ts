import { describe, expect, it } from "vitest";
import { autoMap, classify } from "./mapper";
import { normalizeWithMap, enrich } from "./normalize";
import { underwrite } from "./underwrite";
import { contactFor, groupDuplicateContacts, isReachable, isReady, sortKey } from "./modes";
import { exportCsv, type ExportRow } from "./export";
import { DEFAULT_SETTINGS } from "./types";
import Papa from "papaparse";

// A small PropStream-style export: mixed qualifying/non-qualifying rows,
// a foreign-header PropWire row, and two rows sharing one listing agent
// (to exercise duplicate-contact grouping).
const PROPSTREAM_CSV = `Property Address,Property City,Property State,Property Zip,Estimated Market Value,Estimated Loan Balance,Estimated Equity,Monthly Rent,Est Total Monthly Payments,MLS Agent Name,MLS Agent Email,MLS Agent Phone
100 Ordnance Way,Phoenix,AZ,85001,300000,150000,150000,2200,900,Alex Agent,alex@brokerage.com,602-555-0001
200 Salvo Blvd,Phoenix,AZ,85002,120000,110000,10000,1100,700,Alex Agent,alex@brokerage.com,602-555-0001
300 Underwater Dr,Tempe,AZ,85281,90000,120000,-30000,900,650,Casey Agent,casey@brokerage.com,602-555-0002
`;

const PROPWIRE_CSV = `Site Address,Site City,Site State,Site Zip,AVM,Market Rent,Owner First Name,Owner Last Name,Phone
400 Foreign Header St,Mesa,AZ,85201,250000,1900,Jamie,Owner,4805550003
`;

function parseCsv(csv: string) {
  const result = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  return { headers: result.meta.fields ?? [], rows: result.data };
}

describe("end-to-end import -> underwrite -> export pipeline", () => {
  it("imports a PropStream-style list, underwrites every row, and qualifies the expected set", () => {
    const { headers, rows } = parseCsv(PROPSTREAM_CSV);
    const map = autoMap(headers);
    const classification = classify(map);
    expect(classification.kind).toBe("base");
    expect(classification.missing).toHaveLength(0);

    const properties = normalizeWithMap(rows, map, headers);
    expect(properties).toHaveLength(3);

    const underwritten = properties.map((p) => ({ property: p, u: underwrite(p, DEFAULT_SETTINGS) }));

    const ordnanceWay = underwritten.find((r) => r.property.address === "100 Ordnance Way")!;
    expect(ordnanceWay.u.creative_ok).toBe(true);
    expect(ordnanceWay.u.cash_ok).toBe(true);

    const salvoBlvd = underwritten.find((r) => r.property.address === "200 Salvo Blvd")!;
    // small equity -> small down -> should still pencil, but cash offer (80% of 120k = 96k) clears a 110k loan? No.
    expect(salvoBlvd.u.cash).toBe(96000);
    expect(salvoBlvd.u.net_cash).toBe(-14000);
    expect(salvoBlvd.u.cash_ok).toBe(false); // cash doesn't clear the loan

    const underwaterDr = underwritten.find((r) => r.property.address === "300 Underwater Dr")!;
    expect(underwaterDr.u.creative_ok).toBe(false); // negative equity
    expect(underwaterDr.u.cash_ok).toBe(false); // cash offer underwater too
  });

  it("maps a foreign PropWire header set through the same pipeline", () => {
    const { headers, rows } = parseCsv(PROPWIRE_CSV);
    const map = autoMap(headers);
    expect(classify(map).kind).toBe("base");

    const [property] = normalizeWithMap(rows, map, headers);
    expect(property.home_value).toBe(250000);
    expect(property.monthly_rent).toBe(1900);
    expect(property.owner_full).toBe("Jamie Owner");
    expect(property.owner_cell).toBe("4805550003");
  });

  it("groups duplicate agent-email listings and reflects that in the export", () => {
    const { headers, rows } = parseCsv(PROPSTREAM_CSV);
    const map = autoMap(headers);
    const properties = normalizeWithMap(rows, map, headers);

    const base = properties.map((property) => ({
      property,
      underwrite: underwrite(property, DEFAULT_SETTINGS),
      contact: contactFor(property, "agent"),
    }));

    const groups = groupDuplicateContacts(base);
    expect(groups.get("alex@brokerage.com")).toHaveLength(2);

    const exportRows: ExportRow[] = base.map((r) => ({ ...r, dnc: false }));
    const csv = exportCsv(exportRows, "agent", "both");
    const parsed = Papa.parse<string[]>(csv);
    const [header, ...dataRows] = parsed.data.filter((r) => r.length > 1);
    const listingsCol = header.indexOf("Listings For Contact");
    const addressForAlexRows = dataRows.filter((r) => r[header.indexOf("Contact Email")] === "alex@brokerage.com");
    expect(addressForAlexRows).toHaveLength(2);
    for (const row of addressForAlexRows) {
      expect(row[listingsCol]).toBe("2");
    }
  });

  it("enriches a base list with a skip-trace file and enables Direct-to-Seller", () => {
    const { headers: baseHeaders, rows: baseRows } = parseCsv(PROPSTREAM_CSV);
    const baseMap = autoMap(baseHeaders);
    const baseProps = normalizeWithMap(baseRows, baseMap, baseHeaders);

    const skipTraceCsv = `Property Address,Phone 1,Phone 1 Type,Phone 1 DNC,Email 1
100 Ordnance Way,6025551234,Mobile,N,owner@example.com
`;
    const { headers: skipHeaders, rows: skipRows } = parseCsv(skipTraceCsv);
    const skipMap = autoMap(skipHeaders);
    const skipClassification = classify(skipMap);
    expect(skipClassification.kind).toBe("enrichment");

    const skipProps = normalizeWithMap(skipRows, skipMap, skipHeaders);
    const enriched = enrich(baseProps, skipProps);

    const ordnanceWay = enriched.find((p) => p.address === "100 Ordnance Way")!;
    expect(ordnanceWay.owner_cell).toBe("6025551234");
    expect(ordnanceWay.owner_email).toBe("owner@example.com");

    const sellerContact = contactFor(ordnanceWay, "seller");
    expect(sellerContact.viaAgent).toBe(false);
    expect(isReachable(sellerContact, ordnanceWay.owner_dnc)).toBe(true);
  });

  it("sorts ready rows by the correct key per offer mode", () => {
    const { headers, rows } = parseCsv(PROPSTREAM_CSV);
    const map = autoMap(headers);
    const properties = normalizeWithMap(rows, map, headers);
    const underwritten = properties.map((p) => underwrite(p, DEFAULT_SETTINGS));

    const readyBoth = underwritten.filter((u) => isReady("both", u));
    const sorted = [...readyBoth].sort((a, b) => sortKey("both", b) - sortKey("both", a));
    expect(sorted[0].creative_ok || sorted[0].cash_ok).toBe(true);
  });
});
