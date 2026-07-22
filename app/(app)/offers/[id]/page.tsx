"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsPanel } from "@/components/salvo/SettingsPanel";
import { LOIPreview } from "@/components/salvo/LOIPreview";
import { useSalvoStore } from "@/lib/store/salvo-store";
import { underwrite } from "@/lib/engine/underwrite";
import { contactFor } from "@/lib/engine/modes";
import { fcS, fcT } from "@/lib/engine/format";
import type { OfferRow } from "@/lib/hooks/useOfferRows";

const OFFER_TYPES = [
  { key: "cash", label: "Cash", available: true },
  { key: "seller-finance", label: "Seller Finance / Subject-To", available: true },
  { key: "lease-option", label: "Lease Option", available: false },
  { key: "hybrid", label: "Hybrid", available: false },
  { key: "land", label: "Land Contract", available: false },
];

function Metric({ label, value, accent }: { label: string; value: string; accent?: "gain" | "loss" }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-line bg-canvas px-3 py-2">
      <span className="text-[11px] uppercase tracking-wide text-ink-2">{label}</span>
      <span className={`font-mono-data text-sm font-semibold ${accent === "gain" ? "text-gain" : accent === "loss" ? "text-loss" : "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

export default function OfferBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const address = decodeURIComponent(id);
  const properties = useSalvoStore((s) => s.properties);
  const globalSettings = useSalvoStore((s) => s.settings);
  const target = useSalvoStore((s) => s.target);

  const property = useMemo(() => properties.find((p) => p.address === address), [properties, address]);
  const [localSettings, setLocalSettings] = useState(globalSettings);
  const [showSettings, setShowSettings] = useState(true);
  const [loiOpen, setLoiOpen] = useState(false);

  if (!property) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-ink-2">No property found for &ldquo;{address}&rdquo;.</p>
          <Link href="/offers" className="text-sm text-steel hover:underline">
            Back to the Offers console
          </Link>
        </CardContent>
      </Card>
    );
  }

  const u = underwrite(property, localSettings);
  const contact = contactFor(property, target);
  const loiRow: OfferRow = {
    property,
    underwrite: u,
    contact,
    ready: u.creative_ok || u.cash_ok,
    reachable: true,
    dnc: false,
    sort: 0,
    listingsForContact: 1,
  };

  return (
    <div className="flex flex-col gap-4">
      <Link href="/offers" className="flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to Offers console
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{property.address}</h1>
          <p className="text-sm text-ink-2">
            {contact.name ?? "Unknown contact"} {contact.email ? `· ${contact.email}` : ""} {contact.phone ? `· ${contact.phone}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {u.creative_ok && <Badge variant="gold">Creative Ready</Badge>}
          {u.cash_ok && <Badge variant="steel">Cash Ready</Badge>}
          <Button variant="outline" size="sm" onClick={() => setShowSettings((v) => !v)}>
            {showSettings ? "Hide sliders" : "Show sliders"}
          </Button>
          <Button size="sm" onClick={() => setLoiOpen(true)}>
            <FileText /> Preview LOI
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {OFFER_TYPES.map((type) => (
          <Badge key={type.key} variant={type.available ? "steel" : "default"}>
            {type.label}
            {!type.available && " · soon"}
          </Badge>
        ))}
      </div>

      {showSettings && (
        <SettingsPanel settings={localSettings} onChange={(patch) => setLocalSettings({ ...localSettings, ...patch })} onReset={() => setLocalSettings(globalSettings)} />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cash offer</CardTitle>
            <CardDescription>Purchase price at {localSettings.cashPct}% of home value, all-cash close.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Metric label="Home Value" value={fcT(u.home_value)} />
            <Metric label="Loan Balance" value={fcT(u.loan_balance)} />
            <Metric label="Cash Scenario" value={fcT(u.cash)} />
            <Metric label="Net Cash" value={fcT(u.net_cash)} accent="gain" />
            <Metric label="Industry Costs Avoided" value={fcT(u.industry_costs)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seller Finance / Subject-To</CardTitle>
            <CardDescription>Straight amortization over {localSettings.amortMonths} months, 0% interest.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Metric label="Price" value={fcT(u.price)} />
            <Metric label="Down Payment" value={fcT(u.down)} />
            <Metric label="Financed" value={fcT(u.financed)} />
            <Metric label="Monthly to Seller" value={fcT(u.m2s)} />
            <Metric label="Sub Payment" value={fcT(u.sub_payment)} />
            <Metric label="Total Monthly" value={fcT(u.total)} />
            <Metric label="Rent" value={fcT(property.monthly_rent)} />
            <Metric label="Seller Profit — Creative" value={fcT(u.net_crea)} accent="gain" />
            <Metric label="Seller Profit — Traditional" value={fcS(u.net_trad)} />
            <Metric label="Seller Finance Difference" value={fcT(u.diff)} accent="gain" />
          </CardContent>
        </Card>
      </div>

      <LOIPreview row={loiOpen ? loiRow : null} open={loiOpen} onOpenChange={setLoiOpen} />
    </div>
  );
}
