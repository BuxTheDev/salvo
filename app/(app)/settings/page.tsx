"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plug, Trash2, ShieldOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSalvoStore } from "@/lib/store/salvo-store";
import { supabaseConfigured } from "@/lib/supabase/client";

export default function SettingsPage() {
  const ghlConnection = useSalvoStore((s) => s.ghlConnection);
  const setGhlConnection = useSalvoStore((s) => s.setGhlConnection);
  const suppressions = useSalvoStore((s) => s.suppressions);
  const addSuppression = useSalvoStore((s) => s.addSuppression);
  const removeSuppression = useSalvoStore((s) => s.removeSuppression);

  const [accessToken, setAccessToken] = useState(ghlConnection?.accessToken ?? "");
  const [locationId, setLocationId] = useState(ghlConnection?.locationId ?? "");
  const [pipelineId, setPipelineId] = useState(ghlConnection?.pipelineId ?? "");
  const [stageId, setStageId] = useState(ghlConnection?.stageId ?? "");

  const [suppressKind, setSuppressKind] = useState<"email" | "phone">("email");
  const [suppressValue, setSuppressValue] = useState("");

  const handleSaveConnection = () => {
    if (!accessToken.trim() || !locationId.trim()) {
      toast.error("Access token and location ID are required.");
      return;
    }
    setGhlConnection({ accessToken: accessToken.trim(), locationId: locationId.trim(), pipelineId: pipelineId.trim() || undefined, stageId: stageId.trim() || undefined });
    toast.success("GHL connection saved locally.");
  };

  const handleAddSuppression = () => {
    if (!suppressValue.trim()) return;
    addSuppression(suppressKind, suppressValue.trim());
    setSuppressValue("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        <p className="text-sm text-ink-2">GoHighLevel connection, org, and the suppression list checked on every export/push.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-ink-2" /> GoHighLevel connection
          </CardTitle>
          <CardDescription>
            Private Integration token (or OAuth app) for GHL API v2 (LeadConnector). Stored locally in this browser until Supabase is
            connected —{" "}
            {supabaseConfigured ? (
              <span className="text-gain">Supabase is connected.</span>
            ) : (
              <span className="text-warn">Supabase is not connected; add NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Access token</Label>
            <Input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="pit-..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Location ID</Label>
            <Input value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="loc_..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Pipeline ID</Label>
            <Input value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} placeholder="acquisitions pipeline" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Stage ID</Label>
            <Input value={stageId} onChange={(e) => setStageId(e.target.value)} placeholder='"Offer Ready" stage' />
          </div>
          <div className="col-span-full flex justify-end">
            <Button onClick={handleSaveConnection}>Save connection</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="h-4 w-4 text-ink-2" /> Suppression list
          </CardTitle>
          <CardDescription>Opt-outs and already-contacted entries. Checked on every CSV export and GHL push.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Select value={suppressKind} onValueChange={(v) => setSuppressKind(v as "email" | "phone")}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={suppressValue}
              onChange={(e) => setSuppressValue(e.target.value)}
              placeholder={suppressKind === "email" ? "name@example.com" : "555-123-4567"}
              onKeyDown={(e) => e.key === "Enter" && handleAddSuppression()}
            />
            <Button onClick={handleAddSuppression}>
              <Plus /> Add
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {suppressions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border border-line bg-canvas px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant={s.kind === "email" ? "steel" : "gold"}>{s.kind}</Badge>
                  <span className="font-mono-data text-sm">{s.value}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeSuppression(s.id)}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {suppressions.length === 0 && <p className="text-sm text-ink-2">No suppressions yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
