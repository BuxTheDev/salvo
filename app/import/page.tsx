"use client";
import Link from "next/link";
import { SmartImport } from "@/components/SmartImport";
import { useNormalized, useReport } from "@/lib/derived";
import { usd } from "@/lib/engine/format";

export default function ImportPage() {
  const norm = useNormalized();
  const report = useReport();
  const preview = norm.slice(0, 8);

  return (
    <div>
      <SmartImport startOpen />

      <div className="sv-list">
        <div className="sv-toolbar">
          <span className="sv-h" style={{ margin: 0 }}>Normalized preview · first {preview.length} of {norm.length} rows</span>
          <Link href="/offers" className="sv-btn primary" style={{ textDecoration: "none", pointerEvents: report.kind === "base" ? undefined : "none", opacity: report.kind === "base" ? 1 : 0.4 }}>
            Underwrite {norm.length} rows →
          </Link>
        </div>
        <div className="sv-tablewrap">
          <table className="sv-table">
            <thead>
              <tr>
                <th className="l">Address</th><th>Value</th><th>Loan</th><th>Equity</th>
                <th>Rent</th><th>Payment</th><th>Asking</th><th className="l">Agent</th><th className="l">Owner contact</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r) => (
                <tr key={r.address}>
                  <td className="l">
                    <div className="sv-addr">{r.address} <span className="sv-city">{r.city}{r.city && r.state ? ", " : ""}{r.state}</span></div>
                    <div className="sv-contact">{r.owner_full || "—"}</div>
                  </td>
                  <td>{usd(r.home_value)}</td>
                  <td>{usd(r.loan_balance)}</td>
                  <td>{usd(r.equity)}</td>
                  <td>{usd(r.monthly_rent)}</td>
                  <td>{usd(r.loan_payment)}</td>
                  <td>{usd(r.asking)}</td>
                  <td className="l">{r.agent_name || "—"}</td>
                  <td className="l">{r.owner_email || r.owner_cell || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
