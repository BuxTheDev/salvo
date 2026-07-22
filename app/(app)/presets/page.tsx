"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookmarkPlus, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSalvoStore } from "@/lib/store/salvo-store";

export default function PresetsPage() {
  const presets = useSalvoStore((s) => s.presets);
  const settings = useSalvoStore((s) => s.settings);
  const savePreset = useSalvoStore((s) => s.savePreset);
  const applyPreset = useSalvoStore((s) => s.applyPreset);
  const deletePreset = useSalvoStore((s) => s.deletePreset);
  const [name, setName] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    savePreset(name.trim());
    setName("");
    toast.success(`Saved preset "${name.trim()}"`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Presets</h1>
        <p className="text-sm text-ink-2">Save named underwriting settings profiles — e.g. &ldquo;Phoenix Creative&rdquo;, &ldquo;Vegas Cash&rdquo; — and apply them from the Offers console.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Save current settings</CardTitle>
          <CardDescription>
            downPct {settings.downPct}% · cap ${settings.downCap.toLocaleString()} · amort {settings.amortMonths}mo · tolerance $
            {settings.tolerance} · selling {settings.sellingPct}% · cash {settings.cashPct}%
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Preset name, e.g. Phoenix Creative" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={handleSave} disabled={!name.trim()}>
            <BookmarkPlus /> Save preset
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((preset) => (
          <Card key={preset.id}>
            <CardHeader>
              <CardTitle>{preset.name}</CardTitle>
              <CardDescription>Saved {new Date(preset.createdAt).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between gap-2">
              <Button
                variant="steel"
                size="sm"
                onClick={() => {
                  applyPreset(preset.id);
                  toast.success(`Applied "${preset.name}"`);
                }}
              >
                <Check /> Apply
              </Button>
              <Button variant="ghost" size="sm" onClick={() => deletePreset(preset.id)}>
                <Trash2 /> Delete
              </Button>
            </CardContent>
          </Card>
        ))}
        {presets.length === 0 && <p className="text-sm text-ink-2">No presets saved yet.</p>}
      </div>
    </div>
  );
}
