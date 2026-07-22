"""
=============================================================================
LOI BLASTER — Unified Engine  (merges the five v1 "Finger Blaster" scripts)
=============================================================================
The v1 family was three offer types x three list sources, built as separate
Apps Scripts with drifting field names and inconsistent constants. This
collapses all of it into one pipeline with clean seams:

    ingest(raw)  ->  normalize  ->  enrich(skip-trace)  ->  underwrite
                                                             |
                                              route by blast mode
                                       +----------+----------+
                                       v          v          v
                                 Direct-to-  Direct-to-    Cash
                                   Agent       Seller      Only
                                       \\         |         /
                                        GHL-merge-ready CSV
                                        (field names == your LOI merge tags)

Every constant that was hardcoded in v1 lives in one Settings object, so the
whole matrix is tunable from one place.
=============================================================================
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
import pandas as pd, numpy as np, re


# --------------------------------------------------------------------------
# 1. SETTINGS  — the v1 constants, reconciled and exposed in one place
# --------------------------------------------------------------------------
@dataclass
class Settings:
    down_pct_equity: float = 0.50     # down = this share of equity ...
    down_cap: float = 30_000          # ... capped here
    amort_months: int = 360           # seller-carry straight amortization (0% interest)
    pmt_tolerance: float = 200        # qualify if total monthly <= rent + this
    selling_cost_pct: float = 0.12    # "industry" cost the seller avoids
    industry_cost_basis: str = "value"  # "value" (creative v1) or "offer" (cash-script v1)
    cash_pct: float = 0.80            # cash offer as share of value (v1 used 0.78 AND 0.80)
    require_positive_financed: bool = True   # the fix: no degenerate creative LOIs
    require_cash_clears_loan: bool = True    # don't send an underwater cash offer


# --------------------------------------------------------------------------
# 2. INGEST + NORMALIZE  — detect the source format, map to one schema
# --------------------------------------------------------------------------
# normalized schema (everything downstream speaks only this):
NORM = ["address","city","state","zip","apn","owner_first","owner_last","owner_full",
        "loan_balance","home_value","equity","monthly_rent","loan_payment","asking",
        "ltv","property_type","agent_name","agent_email","agent_phone",
        "owner_cell","owner_email","owner_dnc"]

# column signatures that identify each raw source
SIGNATURES = {
    "propstream": ["Est. Remaining balance of Open Loans", "Est. Value", "MLS Amount"],
    "nod_nos":    ["sitemail", "elv", "emv", "parcel"],
    "batchleads": ["Input_Property_Address", "Phone1_Number", "OWNER_FIRST_NAME"],
}

def detect_source(cols) -> str:
    cols = set(cols)
    for name, sig in SIGNATURES.items():
        if sum(s in cols for s in sig) >= 2:
            return name
    return "unknown"

def _num(x):
    try: return float(x)
    except: return np.nan

def pick_owner_phone(row):
    """PropStream inline skip-trace: prefer first Mobile & non-DNC phone, then
    first non-DNC, then Phone 1. Returns (number, dnc_flag)."""
    best_nondnc = None
    for i in range(1, 6):
        num = row.get(f"Phone {i}")
        if num is None or (isinstance(num, float) and np.isnan(num)): continue
        typ = str(row.get(f"Phone {i} Type") or "").lower()
        dnc = str(row.get(f"Phone {i} DNC") or "").strip().lower() in ("true","yes","1","y")
        if ("mobile" in typ or "wireless" in typ or "cell" in typ) and not dnc:
            return num, False                      # ideal: textable mobile
        if best_nondnc is None and not dnc:
            best_nondnc = num
    if best_nondnc is not None: return best_nondnc, False
    return row.get("Phone 1"), True                # only DNC numbers left

def normalize(df: pd.DataFrame) -> pd.DataFrame:
    src = detect_source(df.columns)
    out = pd.DataFrame(columns=NORM)
    _blank = pd.Series(np.nan, index=df.index)
    g = lambda c: df[c] if c in df.columns else _blank

    if src == "propstream":
        out["address"]=g("Address"); out["city"]=g("City"); out["state"]=g("State")
        out["zip"]=g("Zip"); out["apn"]=g("APN")
        out["owner_first"]=g("Owner 1 First Name"); out["owner_last"]=g("Owner 1 Last Name")
        out["loan_balance"]=g("Est. Remaining balance of Open Loans").map(_num)
        out["home_value"]=g("Est. Value").map(_num); out["equity"]=g("Est. Equity").map(_num)
        out["monthly_rent"]=g("Monthly Rent").map(_num)
        out["loan_payment"]=g("Est. Total Monthly Payments").map(_num)
        out["asking"]=g("MLS Amount").map(_num); out["ltv"]=g("Est. Loan-to-Value").map(_num)
        out["property_type"]=g("Property Type")
        out["agent_name"]=g("MLS Agent Name"); out["agent_phone"]=g("MLS Agent Phone")
        out["agent_email"]=g("MLS Agent E-Mail")
        # PropStream inline skip-trace (present on Direct-to-Seller-ready exports)
        if "Email 1" in df.columns: out["owner_email"]=g("Email 1")
        if "Phone 1" in df.columns:
            picked = df.apply(pick_owner_phone, axis=1)
            out["owner_cell"]=[p[0] for p in picked]
            out["owner_dnc"] =[p[1] for p in picked]

    elif src == "nod_nos":   # county pre-foreclosure export (owner contact!)
        out["address"]=g("sitemail"); out["city"]=g("sitecity"); out["state"]=g("sitestate")
        out["zip"]=g("sitezip"); out["apn"]=g("parcel"); out["owner_full"]=g("owner")
        out["home_value"]=g("emv").map(_num); out["loan_balance"]=g("elv").map(_num)
        out["owner_cell"]=g("phone"); out["owner_email"]=g("email")

    elif src == "batchleads":  # skip-trace enrichment source
        out["address"]=g("Input_Property_Address"); out["city"]=g("Input_Property_City")
        out["state"]=g("Input_Property_State"); out["zip"]=g("Input_Property_Zip")
        out["owner_first"]=g("OWNER_FIRST_NAME"); out["owner_last"]=g("OWNER_LAST_NAME")
        out["owner_cell"]=g("Phone1_Number"); out["owner_email"]=g("Email1")
    else:
        raise ValueError(f"Unrecognized list format. Columns: {list(df.columns)[:8]}...")

    # owner_full where we have first/last
    fn = out["owner_first"].fillna(""); ln = out["owner_last"].fillna("")
    fl = (fn + " " + ln).str.strip()
    out["owner_full"] = out["owner_full"].fillna(fl).replace("", np.nan)
    out["_source"] = src
    return out.dropna(subset=["address"]).reset_index(drop=True)


# --------------------------------------------------------------------------
# 3. ENRICH  — join skip-trace contact onto the base list by address key
# --------------------------------------------------------------------------
def _key(s):
    return (s.astype(str).str.lower().str.replace(r"[^a-z0-9]", "", regex=True))

def enrich(base: pd.DataFrame, *skiptrace: pd.DataFrame) -> pd.DataFrame:
    base = base.copy(); base["_k"] = _key(base["address"])
    for st in skiptrace:
        if st is None or st.empty: continue
        st = st.copy(); st["_k"] = _key(st["address"])
        lut = st.dropna(subset=["_k"]).drop_duplicates("_k").set_index("_k")
        for col in ("owner_cell","owner_email"):
            if col in lut.columns:
                fill = base["_k"].map(lut[col])
                base[col] = base[col].fillna(fill)
    return base.drop(columns="_k")


# --------------------------------------------------------------------------
# 4. UNDERWRITE  — one offer engine, both structures, per row
# --------------------------------------------------------------------------
def underwrite(r, s: Settings) -> dict:
    value=r.home_value; loan=r.loan_balance; eq=r.equity; rent=r.monthly_rent
    loanpmt=r.loan_payment if not pd.isna(r.loan_payment) else 0
    asking=r.asking
    if pd.isna(value) or value==0:
        return {"creative_ok":False,"cash_ok":False,"reason":"no value"}

    # equity fallback if PropStream didn't provide it
    if pd.isna(eq) and not pd.isna(loan): eq = value - loan

    # --- creative (subject-to + seller carry) ---
    down = np.nan if (pd.isna(eq) or eq < 0) else min(eq*s.down_pct_equity, s.down_cap)
    price = asking if not pd.isna(asking) else value
    financed = price - (loan or 0) - (0 if pd.isna(down) else down)
    m2s = financed/s.amort_months if financed > 0 else 0
    total = m2s + loanpmt
    passes_pmt = (not pd.isna(rent)) and total <= rent + s.pmt_tolerance
    creative_ok = (not pd.isna(down)) and passes_pmt and \
                  (financed > 0 if s.require_positive_financed else True)

    isc = value*s.selling_cost_pct
    net_trad = value - isc - (loan or 0)
    net_crea = price - (loan or 0)
    diff = net_crea - net_trad

    # --- cash ---
    cash = value*s.cash_pct
    cash_isc = (cash if s.industry_cost_basis=="offer" else value)*s.selling_cost_pct
    net_cash = cash - (loan or 0)
    cash_ok = (net_cash > 0) if s.require_cash_clears_loan else True

    return dict(
        creative_ok=creative_ok, cash_ok=cash_ok,
        price=price, down=down, financed=max(0,financed), m2s=m2s, total=total,
        sub_payment=loanpmt, industry_costs=isc, home_value=value, loan_balance=loan or 0,
        net_trad=net_trad, net_crea=net_crea, diff=diff,
        cash=cash, cash_industry=cash_isc, net_cash=net_cash,
    )


# --------------------------------------------------------------------------
# 5. ROUTE + FORMAT  — pick contact + merge fields per blast mode
# --------------------------------------------------------------------------
def _fc(v):  # v1 formatCurrencyOrTBD
    if v is None or (isinstance(v,float) and (np.isnan(v) or v<=0)): return "TBD"
    return "${:,.2f}".format(v)
def _fc_signed(v):
    return "TBD" if v is None or (isinstance(v,float) and np.isnan(v)) else "${:,.2f}".format(v)

MODES = {
    # mode -> (needs_contact, offer, contact_fields)
    "direct_to_agent":  ("agent",  "creative"),
    "direct_to_seller": ("seller", "creative"),
    "cash":             ("seller", "cash"),   # cash usually goes to owner; falls back to agent
}

def build_row(r, u, mode) -> dict | None:
    who, offer = MODES[mode]
    # contact resolution
    if who == "agent":
        name, email, phone = r.agent_name, r.agent_email, r.agent_phone
    else:
        name = r.owner_full; email = r.owner_email; phone = r.owner_cell
        if pd.isna(email) and pd.isna(phone):   # fall back to agent if no skip-trace hit
            name, email, phone = r.agent_name, r.agent_email, r.agent_phone
    if (offer=="creative" and not u["creative_ok"]) or (offer=="cash" and not u["cash_ok"]):
        return None

    base = {"Contact Name": name, "Contact Email": email, "Contact Phone": phone,
            "Owner Full Name": r.owner_full, "Address": r.address, "City": r.city, "State": r.state}
    if offer == "creative":
        base.update({
            "Price": _fc(u["price"]), "Loan Balance": _fc(u["loan_balance"]),
            "Down": _fc(u["down"]), "Financed": _fc(u["financed"]),
            "Payment": _fc(u["m2s"]), "Sub Payment": _fc(u["sub_payment"]),
            "Seller Profit Creative": _fc(u["net_crea"]),
            "Seller Profit Traditional": _fc_signed(u["net_trad"]),
            "Seller Profit Difference": _fc(u["diff"]),
            "Industry Costs": _fc(u["industry_costs"]), "Home Value": _fc(u["home_value"]),
            "_diff": u["diff"]})
    else:  # cash — mapped to unified merge tags (see note in engine header)
        base.update({
            "Cash Scenario": _fc(u["cash"]), "Net Cash": _fc(u["net_cash"]),
            "Industry Costs": _fc(u["cash_industry"]), "Loan Balance": _fc(u["loan_balance"]),
            "Home Value": _fc(u["home_value"]), "_diff": u["net_cash"]})
    return base

def run(base_df, mode, settings=None, skiptrace=()):
    s = settings or Settings()
    norm = normalize(base_df)
    norm = enrich(norm, *[normalize(st) for st in skiptrace]) if skiptrace else norm
    rows=[]
    for r in norm.itertuples():
        u = underwrite(r, s)
        row = build_row(r, u, mode)
        if row: rows.append(row)
    out = pd.DataFrame(rows)
    if not out.empty: out = out.sort_values("_diff", ascending=False).drop(columns="_diff")
    return norm, out


# --------------------------------------------------------------------------
# 6. DEMO  — run against the real uploaded PropStream sample
# --------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    src = sys.argv[1] if len(sys.argv) > 1 else \
        "CASH_OFFERS_-_THE_LOI_FINGER_BLASTER.xlsx"
    raw = pd.read_excel(src, sheet_name="IMPORT")
    print(f"Loaded {len(raw)} raw rows | detected source: {detect_source(raw.columns)}\n")

    for mode in ("direct_to_agent", "direct_to_seller", "cash"):
        norm, out = run(raw, mode)
        print(f"[{mode:>16}]  {len(out):>3} offers ready "
              f"(from {len(norm)} normalized rows)")
        out.to_csv(f"/mnt/user-data/outputs/out_{mode}.csv", index=False)
    print("\nWrote out_direct_to_agent.csv / out_direct_to_seller.csv / out_cash.csv")
