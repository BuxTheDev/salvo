/** Normalized property — the only shape the engine speaks (spec §4.2). */
export interface Property {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  home_value: number;
  loan_balance?: number;
  equity?: number;
  monthly_rent?: number;
  loan_payment?: number;
  asking?: number;
  owner_full?: string;
  owner_first?: string;
  owner_last?: string;
  agent_name?: string;
  agent_email?: string;
  agent_phone?: string;
  owner_cell?: string;
  owner_email?: string;
  owner_dnc?: boolean;
}

/** Output of `underwrite` (spec §4.3). Numeric fields absent when the row has no value. */
export interface UnderwriteResult {
  creative_ok: boolean;
  cash_ok: boolean;
  price?: number;
  /** null = equity unknown or negative → "TBD" on the LOI */
  down?: number | null;
  financed?: number;
  m2s?: number;
  total?: number;
  sub_payment?: number;
  industry_costs?: number;
  home_value?: number;
  loan_balance?: number;
  net_trad?: number;
  net_crea?: number;
  /** The Seller Finance Difference — the persuasion hook and creative sort key. */
  diff?: number;
  cash?: number;
  net_cash?: number;
}

export type Target = "agent" | "seller";
export type Offer = "creative" | "cash" | "both";

export interface Contact {
  name?: string;
  email?: string;
  phone?: string;
  viaAgent: boolean;
}

/** A single header→field mapping decision. */
export interface MapEntry {
  header: string;
  how: "exact" | "fuzzy" | "manual";
}
export type Mapping = Partial<Record<string, MapEntry>>;

export type FileKind = "base" | "enrichment" | "incomplete";

export interface FileReport {
  missing: string[];
  contact: boolean;
  kind: FileKind;
}

/** One raw CSV row, as parsed by papaparse with header: true. */
export type RawRow = Record<string, unknown>;

/** A property scored for the current Target × Offer mode. */
export interface ScoredRow {
  r: Property;
  u: UnderwriteResult;
  creativeOK: boolean;
  cashOK: boolean;
  ready: boolean;
  contact: Contact;
  sortVal: number;
  /** number of ready listings sharing this contact's email (≥ 1) */
  dup: number;
}
