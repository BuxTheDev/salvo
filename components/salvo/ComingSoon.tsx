import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function ComingSoon({ icon: Icon, title, description, phase }: { icon: LucideIcon; title: string; description: string; phase: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Icon className="h-10 w-10 text-ink-2" />
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="max-w-md text-sm text-ink-2">{description}</p>
        <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink-2">{phase}</span>
      </CardContent>
    </Card>
  );
}
