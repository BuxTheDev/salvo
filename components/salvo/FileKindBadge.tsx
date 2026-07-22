import { Badge } from "@/components/ui/badge";
import type { FileKind } from "@/lib/engine/mapper";

const KIND_META: Record<FileKind, { label: string; variant: "gain" | "steel" | "warn" }> = {
  base: { label: "Base — ready to blast", variant: "gain" },
  enrichment: { label: "Enrichment — skip-trace / phone list", variant: "steel" },
  incomplete: { label: "Incomplete — missing required fields", variant: "warn" },
};

export function FileKindBadge({ kind }: { kind: FileKind }) {
  const meta = KIND_META[kind];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
